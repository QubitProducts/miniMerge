/*
 *  Copyright 2013 @ QubitProducts.com
 *
 *  MiniMerge is free software: you can redistribute allPaths and/or modify
 *  allPaths under the terms of the Lesser GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  MiniMerge is distributed in the hope that allPaths will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  Lesser GNU General Public License for more details.
 *
 *  You should have received a copy of the Lesser GNU General Public License.
 *  If not, see LGPL licence at http://www.gnu.org/licenses/lgpl-3.0.html.
 *
 *  @author Peter (Piotr) Fronc 
 */

package com.qubitproducts.compilejs;

import static com.qubitproducts.compilejs.Log.LOG;
import static com.qubitproducts.compilejs.Log.log;
import com.qubitproducts.compilejs.fs.LineReader;
import static com.qubitproducts.compilejs.MainProcessorHelper.chunkToExtension;
import com.qubitproducts.compilejs.fs.CFile;
import com.qubitproducts.compilejs.fs.FSFile;
import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.FileNotFoundException;
import java.io.IOException;
import java.io.StringReader;
import java.io.StringWriter;
import java.io.Writer;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.logging.Level;
import java.util.logging.Logger;
import java.util.regex.Pattern;

/**
 *
 * @author Peter (Piotr) Fronc <peter.fronc@qubitproducts.com>
 */
public class MainProcessor {
  
  public static final String RET = "\n";
  public static final String EMPTY = "";
  public static final char FSLASH = '/';
  public static final char DOT = '.';
  public static final String TIL = "~";
  public static final String IMPORT = ":import";
  public static final String INCLUDE = ":include";
  public static final String CSS = ":css";
  
  private String sandbox = null;
  
//  static private final Pattern dotsToSlashesPattern =  Pattern.compile("\\.");
  static private final Pattern importPattern =  Pattern.compile(IMPORT);
  static private final Pattern includePattern =  Pattern.compile(INCLUDE);
  static private final Pattern cssPattern =  Pattern.compile(CSS);
  
  
  private static int importLen = IMPORT.length();
  /**
   * 
   * @param trimmedString
   * @param starts
   * @return 
   */
  static private String getImportPath(String trimmedString, boolean starts) {
    if (starts) {
      trimmedString = trimmedString.substring(importLen);
    } else {
      trimmedString = importPattern.matcher(trimmedString).replaceFirst(EMPTY);
    }
    trimmedString = translateClassPath(trimmedString);
    return trimmedString + dotJS;
  }
  
  static public boolean classPathChar(char ch) {
    return (ch >= 'A' && ch <= 'Z') ||
          (ch >= 'a' && ch <= 'z') ||
          (ch >= '0' && ch <= '9') ||
          ch == '_';
  }
  
  static public boolean isClasspath(String string) {
    if (string == null) return false;
    
    if (!classPathChar(string.charAt(0)) 
        || (string.charAt(0) == '_')) {
      return false;
    }
    
    for (int i = 1; i < string.length(); i++) {
      if (!classPathChar(string.charAt(0))) {
        return false;
      }
    }
    
    return true;
  }
  
  static public String translateClassPath(String path) {
    int len = path.length();
    StringBuilder sb = new StringBuilder();
    int curr = 0;
    boolean prevDot = false;
    boolean oneDotUSed = false;
    char lastChar = 0;
    for (int i = 0; i < len; i++) {
      char ch = path.charAt(i);
      boolean acceptable = classPathChar(ch) || ch == '*';
      if (acceptable) {
        if (prevDot) {
          if (curr > 0) {
            if (!oneDotUSed && lastChar == '#') {
              oneDotUSed = true;
              sb.append(".");
            } else sb.append(FSLASH);
            curr++;
          }
          prevDot = false;
        }
        
        sb.append(ch);
        curr++;
      } else {
        prevDot = true;
      }
      lastChar = ch;
    }
    
    return sb.toString();
  }
  
  private static int cssLen = CSS.length();
  /**
   * 
   * @param trimmedString
   * @param starts
   * @return 
   */
  static private String getCssPath(String trimmedString, boolean starts) {
    if (starts) {
      trimmedString = trimmedString.substring(cssLen);
    } else {
      trimmedString = cssPattern.matcher(trimmedString).replaceFirst(EMPTY);
    }
    trimmedString = translateClassPath(trimmedString);
    return trimmedString + ".css";
  }
  
  /**
   * Include dependency directive cleaner. Cleans :include string and returns
   * path only.
   *
   * @param string
   * @return plain path
   */
  private static int includeLen = INCLUDE.length();
  static private String getNormalPath(String trimmedString, boolean startsWith) {
    if (startsWith) {
      trimmedString = trimmedString.substring(includeLen);
    } else {
      trimmedString = includePattern.matcher(trimmedString).replaceFirst(EMPTY);
    }
    trimmedString = trimmedString.trim();
    return trimmedString;
  }
  
  private boolean keepLines = true;
  
  /*
   * simple custom console logger
   */
    private Map<String, List<String>> lineReaderCache;
  
  
  /**
   * Simple logging function.
   * It does log if this.isVeryVerbosive() returns true
   * @param msg 
   */
  public void logVeryVerbosive(String msg) {
    if (this.isVeryVerbosive()) {
      log(msg);
    }
  }
  private String cwd = null;
  boolean ignoreAllIgnores = false;//@TODO implement
  private String[] ignores = null;
  private String[] mergeOnly = null;
  private String[] sourceBase = {EMPTY};
  private String[] fromToIgnore = null;
  private boolean ignoreRequire = false;
  private boolean checkEveryLine = true;
  private String currentIndent = EMPTY;
  private boolean veryVerbosive = false;
  private boolean ignoringIndents;
  private int indentLevel = 0;
  private String[] fileIgnores = {
    "////!ignore!////",
    "/****!ignore!****/",
    "##!ignore!##"
  };
  private String[] fileExcludePatterns = null;
  private String[] filePathExcludePatterns = null;


  /**
   * Private function checking if line should be excluded. It uses instance
   * defined ignore rules. The rule is that any line containing the string will
   * be ignored.
   *
   * @param line String line to be tested
   * @return
   */
  private boolean excludingFile(String line) {
    if (line == null) {
      return false;
    }
    for (String matcher : this.getFileIgnores()) {
      if (matcher != null 
          && matcher.length() > 0 
          && line.startsWith(matcher)) {
        return true;
      }
    }
    return false;
  }

  /**
   * @return the keepLines
   */
  public boolean isKeepLines() {
    return keepLines;
  }

  /**
   * @param keepLines the keepLines to set
   */
  public void setKeepLines(boolean keepLines) {
    this.keepLines = keepLines;
  }

  /**
   * @return the preProcessorChar
   */
  public char getPreProcessorChar() {
    return preProcessorChar;
  }

  /**
   * @param preProcessorChar the preProcessorChar to set
   */
  public void setPreProcessorChar(char preProcessorChar) {
    this.preProcessorChar = preProcessorChar;
  }

  void setLineReaderCache(Map<String, List<String>> cache) {
    this.lineReaderCache = cache;
  }

    /**
     * @return the lineReaderCache
     */
  public Map<String, List<String>> getLineReaderCache() {
    return this.lineReaderCache;
  }

  public enum Types {
    INCLUDE("N"),
    CSS("C"),
    REQUIRE("R"),
    IMPORT("I");

    private final String text;

    /**
     * @param text
     */
    private Types(final String text) {
        this.text = text;
    }

    /* (non-Javadoc)
     * @see java.lang.Enum#toString()
     */
    @Override
    public String toString() {
        return text;
    }
}
  
  final static String includeS = ":include ";
  final static String importS = ":import ";
  final static String cssS = ":css ";
  final static String reqPrefix = "= ";
  final static String dotJS = ".js";
  
  private char preProcessorChar = '/';
  
  /**
   * Resolves a dependency path from given string line. If line contains
   * //:include file.txt file.txt will be returned. If line contains //=require
   * <file>
   * the file.js will be returned (requirejs support)
   *
   * @param {java.lang.String } line string to be parsed
   * @return {java.lang.String} dependency string or null if not found.
   */
  private boolean onlyClassPath = false;
  public boolean onlyClassPath(boolean set) {
    return onlyClassPath = set;
  }
  
  public boolean onlyClassPath () {
    return onlyClassPath;
  }
  
  private Object[] parseDependencyFromLine(String line) {
    Object[] addedPath = new Object[2];
    if (line != null) {
        line = line.trim();
        
        if (line.length() < 4) {
          return null; 
        }
        
        char ch = line.charAt(2);
        if (ch != ':' && ch != '=') {
          return null;
        }
        
        char c1 = line.charAt(0);
        char c2 = line.charAt(1);
        
        if (c1 != c2) return null;
        if (c1 != preProcessorChar) return null;
        
        line = line.substring(2);
        
        if (line.startsWith(importS)) {
          addedPath[0] = getImportPath(line, true);
          addedPath[1] = Types.IMPORT;
        } else if (line.startsWith(cssS)) {
          addedPath[0] = getCssPath(line, true);
          addedPath[1] = Types.CSS;
        } else if (!this.onlyClassPath()) {
          if (line.startsWith(includeS)) {
            addedPath[0] = getNormalPath(line, true);
            addedPath[1] = Types.INCLUDE;
          } else if ((!isIgnoreRequire()) && (line.startsWith(reqPrefix))) {
            addedPath[0] = MainProcessorHelper.getRequirePath(line) + dotJS;
            addedPath[1] = Types.REQUIRE;
          } else {
            return null;
          }
        } else {
            return null;
        }
        
        return addedPath;
    }
    return null;
  }

  /**
   * Source base object getter.
   * Note that First element from this array is always used as a base directory
   * for processing file dependencies with getFilesListFromFile
   * @see getFilesListFromFile
   * 
   * @return the sourceBase
   */
  public String[] getSourceBase() {
    return sourceBase;
  }

  /**
   * @param sourceBase the sourceBase to set
   */
  public void setSourceBase(String[] sourceBase) {
    List<String> srcs = new ArrayList<String>();
    for (int i = 0; i < sourceBase.length; i++) {
      String srcBase = new CFile(getCwd(), sourceBase[i]).getPath();
      srcBase = srcBase + CFile.separator;
      srcs.add(srcBase);
      if (LOG)logVeryVerbosive("Source No. " + i + " base set to: " + srcBase);
    }
    this.sourceBase = srcs.toArray(new String[0]);
  }
  
  private List<String> getMatchingFiles(String baseSrc, String base, String pattern) {
      List<String> list = new ArrayList<String>();
      
      FSFile location = new CFile(getCwd(), baseSrc);
      location = new CFile(location, base);
      FSFile[] files = location.listFiles();
      
      pattern = pattern.trim();
      
      if (pattern.equals(EMPTY)) {
          return list;
      }
      
      String[] chunks = pattern.split("\\*");

      for (FSFile file : files) {
          if (!file.isDirectory() && file.getName().startsWith(chunks[0]) &&
              (chunks.length < 2 || file.getName().endsWith(chunks[1]))) {
              list.add(new CFile(base, file.getName()).getPath());
          }
      }
      
      return list;
  }
  
  private final HashMap<String,String> helpingMap = new HashMap<String, String>();
  private final HashMap<String, List<String[]>> helpingImportsMap = 
                                            new HashMap<String, List<String[]>>();
  /**
   * Function finds dependency path depending on input specified and
   * sourceBase array. It returns null if none of matched paths corresponds
   * to existing file.
   * It constructs paths by prefixing dependencyPathString with all sourceBase
   * paths and checking if any of paths is a file - if yes, the tested path is
   * returned and its base.
   * 
   * 
   * @param dependencyPathObject
   * @return Array of strings with path at 0 index and
   * source base at 1 index if dependency exists or null otherwise.
   */
  private List<String[]> getDependenciesPath(Object[] dependencyPathObject) {   //OPTIMISE
      
    if (dependencyPathObject == null || dependencyPathObject.length < 2) {
        return null;
    }
    
    Types type = (Types) dependencyPathObject[1];
    String pathPattern = (String) dependencyPathObject[0];
    
    ArrayList<String[]> results = new ArrayList<String[]>();
    List<String> objectives = new ArrayList<String>();
    String pathPlusType = null;
    
    //convert and read from imports
    if (type == Types.IMPORT || type == Types.CSS) {
      pathPlusType = pathPattern + type.toString();
      if (helpingImportsMap.containsKey(pathPlusType)) {
        return helpingImportsMap.get(pathPlusType);
      } else if (pathPattern.contains("*")) {
        //regex at end
        int endingLastSlash;
        int lastSlash = endingLastSlash = pathPattern.lastIndexOf("/");
        
        if (lastSlash < 0) {
          lastSlash = 0;
        }
        
        String starting = pathPattern.substring(0, lastSlash);
        String ending
            = pathPattern.substring(endingLastSlash + 1);
        
        String[] dirs = this.getSourceBase();

        for (String dir : dirs) {
          FSFile fileBase = new CFile(dir, starting);
          FSFile tmp = new CFile(getCwd(), fileBase.getPath());

          if (this.checkIfExists(tmp)) {
            List<String> list = getMatchingFiles(
                dir,
                starting,
                ending);
            objectives.addAll(list);
            //break;
          }
        }
      } else {
        objectives.add(pathPattern);
      }
    } else {
      objectives.add(pathPattern);
    }

    //standard paths
    for (String objective : objectives) {
      String dependencyPathString = objective;
      if (dependencyPathString != null) {
        String[] dirs = this.getSourceBase();
        if (dirs.length == 1) {
          if (this.isAssumeFilesExist()) {
            String path = dirs[0] + dependencyPathString;
            helpingMap.put(path, null);
            results.add(new String[]{path, dirs[0]});
          }
        }
        for (String dir : dirs) {
          String path = dir + dependencyPathString;
          //@todo - adding virtual paths??? so fir single repo virtual path is listed?
          if (helpingMap.containsKey(path)
              || this.checkIfExists(new CFile(getCwd(), path))) {
            helpingMap.put(path, null);
            results.add(new String[]{path, dir});
          }
        }
      }
    }

    if (pathPlusType != null) {
      helpingImportsMap.put(pathPattern, results);
    }
    
    return results.isEmpty() ? null : results;
  }

  private boolean assumeFilesExist = false;
  private final HashMap<String, Boolean> existingFiles = 
          new HashMap<String, Boolean>();
  private boolean checkIfExists (FSFile file) {
    Boolean exists = existingFiles.get(file.getAbsolutePath());
    if (exists == null) {
      exists = file.exists();
      existingFiles.put(file.getAbsolutePath(), exists);
      return exists;
    } else {
      return exists == true;
    }
  }
  
  /**
   * @return the fileExcludePatterns
   */
  public String[] getFileExcludePatterns() {
    return fileExcludePatterns;
  }

  /**
   * @param fileExcludePatterns the fileExcludePatterns to set
   */
  public void setFileExcludePatterns(String[] fileExcludePatterns) {
    this.fileExcludePatterns = fileExcludePatterns;
  }

  /**
   * @return the filePathExcludePatterns
   */
  public String[] getFilePathExcludePatterns() {
    return filePathExcludePatterns;
  }

  /**
   * @param filePathExcludePatterns the filePathExcludePatterns to set
   */
  public void setFilePathExcludePatterns(String[] filePathExcludePatterns) {
    this.filePathExcludePatterns = filePathExcludePatterns;
  }

  /**
   * @return the cwd
   */
  public String getCwd() {
    return cwd;
  }

  /**
   * @param cwd the cwd to set
   */
  public void setCwd(String cwd) {
    this.cwd = cwd;
  }

  /**
   * @return the assumeFilesExist
   */
  public boolean isAssumeFilesExist() {
    return assumeFilesExist;
  }

  /**
   * @param assumeFilesExist the assumeFilesExist to set
   */
  public void setAssumeFilesExist(boolean assumeFilesExist) {
    this.assumeFilesExist = assumeFilesExist;
  }

  /**
   * @return the cacheFilesForMerge
   */
  public boolean isCacheFilesForMerge() {
    return cacheFilesForMerge;
  }

  /**
   * @param cacheFilesForMerge the cacheFilesForMerge to set
   */
  public void setCacheFilesForMerge(boolean cacheFilesForMerge) {
    this.cacheFilesForMerge = cacheFilesForMerge;
  }

    /**
     * @return the processor
     */
    public List<Processor> getProcessors() {
        return processors;
    }

    /**
     * @param processor the processor to set
     */
    public void addProcessor(Processor processor) {
        this.processors.add(processor);
    }


  
  /**
   * Default strings used to specify lines ignored during merge.
   */
  protected String[] IGNORE = {
    "/*D*/",
    "//=",
    "//:include",
    "//:import",
    "//:css",
    "//= require"
  };
  
  protected String[] IGNORE_CLASSPATH = {
    "/*D*/",
    "//:import",
    "//:css"
  };
  
  /**
   * Default string used to specify merged files. "*" means that any file will
   * be included.
   */
  protected String[] EXT_TO_MERGE = {
    "*"
  };
  
  /**
   * Default definitions for blocks to be ignored.
   */
  protected String[] FROM_TO_IGNORE = {
    //"/*~debug*/", "/*~*/"
  };

  /**
   * MiniProcessor class constructor. It accepts String as a argument - path to
   * output file.
   *
   * @param output java.lang.String path to output file
   */
  public MainProcessor() {
    this.ignores = this.onlyClassPath() ? IGNORE_CLASSPATH : IGNORE;
    this.mergeOnly = EXT_TO_MERGE;
    this.fromToIgnore = FROM_TO_IGNORE;
  }

  /**
   * Function listing recursively entire files tree. 
   * Similar to plain find in UNIX.
   *
   * @param file  java.io.FSFile FSFile specifying tree root node (mostly a
   * directory).
   * @return List list of files.
   */
  public static List<FSFile> listFilesTree(FSFile file) {
    ArrayList<FSFile> results = new ArrayList();
    FSFile[] files = file.listFiles();
    if (files == null) {
      results.add(file);
    } else {
      for (FSFile file1 : files) {
        if (!file1.isDirectory()) {
          results.add(file1);
        } else {
          List<FSFile> subdir = listFilesTree(file1);
          results.addAll(subdir);
        }
      }
    }
    return results;
  }

  /**
   * Tester function for string if contains any if this.ignores patterns.
   *
   * @param test String to be tested
   * @return true if string matches ignore pattern
   * @see ignores
   */
  protected boolean isLineIgnored(String test) {
    for (String matcher : this.getIgnores()) {
      if (matcher != null && matcher.length() > 0 && test.contains(matcher)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Tester function to check if the string ends with one of specified
   * this.mergeOnly strings.
   *
   * @param test
   * @return
   */
  protected boolean testIfFileIncluded(FSFile test) {
    String[] strings = this.getMergeOnly();
    String name = test.getName();
    for (String string : strings) {
      if (string.equals("*") || name.endsWith(string)) {
        if (this.getFileExcludePatterns() != null) {
          for(String match : this.getFileExcludePatterns()) {
            if (name.matches(match)) {
              return false;
            }
          }
        }
        if (this.getFilePathExcludePatterns() != null) {
          for(String match : this.getFilePathExcludePatterns()) {
            try{
              if (test.getCanonicalPath().matches(match)) {
                return false;
              }
            } catch (IOException e) {
              //just try
            }
          }
        }
        return true;
      }
    }
    return false;
  }

  /**
   * Function merging files content by given paths map in the order 
   * defined by the map implementation.
   * 
   * @param paths Set of paths to be merged
   * @param output
   * @return String buffer as output of the merge process
   * @throws FileNotFoundException
   * @throws IOException
   */
  public StringBuffer mergeFilesAndStripFromWraps(
                            Map<String, String> paths,
                            String output)
                            throws FileNotFoundException, IOException {
    StringBuffer sb = this.mergeFiles(paths, false, output);
    BufferedReader sr = new BufferedReader(new StringReader(sb.toString()));

    StringWriter sw = new StringWriter();
    BufferedWriter bw = new BufferedWriter(sw);
    try {
      MainProcessorHelper.stripFromWraps(sr, bw, this.getFromToIgnore(),
          isKeepLines() ? EMPTY : null);
      StringBuffer ret = sw.getBuffer();
      return ret;
    } finally {
      bw.close();
      sw.close();
    }
  }

    /**
     * Function merging files content by given paths map in the order defined by
     * the map implementation.
     *
     * @param paths map
     * @param checkLinesExcluded should merging check if lines are ignored if
     * true, this function will check each line if must be ignored by using
     * function @see:isLineIgnored
     * @param outputFile to file where to write output
     * @throws IOException
     */
    public void stripAndMergeFilesToFile(
          Map<String, String> paths,
          boolean checkLinesExcluded,
          String outputFile) throws IOException {
        BufferedWriter writer = (new CFile(outputFile)).getBufferedWriter();
        
        try {
            mergeFiles(paths, checkLinesExcluded, writer, outputFile);
        } finally {
            writer.close();
        }
        
        try {
            if (LOG)log(">>> Stripping file: " + outputFile);
            MainProcessorHelper
                .stripFileFromWraps(new CFile(outputFile),
                    this.getFromToIgnore(),
                    isKeepLines() ? EMPTY : null);
            
        } catch (FileNotFoundException ex) {
            Logger.getLogger(MainProcessor.class.getName())
                .log(Level.SEVERE, null, ex);
        } catch (Exception ex) {
            Logger.getLogger(MainProcessor.class.getName())
                .log(Level.SEVERE, null, ex);
        }
    }

  /**
   * Function merging files content by given paths map in the order 
   * defined by the map implementation.
   * 
   * @param paths map
   * @param checkLinesExcluded should merging check if lines are ignored
   * if true, this function will check each line if must be ignored by 
   * using function @see:isLineIgnored
     * @param currentOutputToIgnore
   * @return output string buffer
   * @throws FileNotFoundException
   * @throws IOException
   */
  public StringBuffer mergeFiles(
              Map<String, String> paths,
              boolean checkLinesExcluded,
              String currentOutputToIgnore)
          throws FileNotFoundException, IOException {
    StringWriter writer = new StringWriter();
    this.mergeFiles(paths, checkLinesExcluded, writer, currentOutputToIgnore);
    StringBuffer buf = writer.getBuffer();
    writer.close();
    return buf;
  }

  /**
   * Absolute file system root directory getter for given path..
   * @param path
   * @return
   */
  public String getTopAbsoluteParent(String path) {
    FSFile file = new CFile(new CFile(
            this.getCwd(), path + "anystring"
    ).getAbsolutePath());
    String result = file.getParent();
    while (file.getParent() != null) {
      file = file.getParentFile();
      result = file.getAbsolutePath();
    }
    return result;
  }

  /**
   * Function merging files content by given paths map in the order 
   * defined by the map implementation.
   * 
   * This method DOES NOT close writer! Remember to close streams.
   * 
   * @param paths map
   * @param checkLinesExcluded should merging check if lines are ignored
   * if true, this function will check each line if must be ignored by 
   * using function @see:isLineIgnored
   * @param writer where to write output
   * @param currentOutputToIgnore
   * @throws FileNotFoundException
   * @throws IOException
   */
  public void mergeFiles(
              Map<String, String> paths,
              boolean checkLinesExcluded,
              Writer writer,
              String currentOutputToIgnore)
          throws FileNotFoundException, IOException {
    Iterator<String> it = paths.keySet().iterator();
    while (it.hasNext()) {
      String item = it.next();
      String dirBase = paths.get(item);

      dirBase = new CFile(this.getCwd(), dirBase).getAbsolutePath();
      if (LOG)logVeryVerbosive(">>> Dir Base + Path : " + dirBase + " --> " + item);
      LineReader in = null;
      String topDir = this.getTopAbsoluteParent(dirBase);
      String pathPrefix;
      
      if (item.startsWith(topDir)) {
        pathPrefix = EMPTY;
      } else {
        pathPrefix = dirBase;
      }
      //no Cwd here!
      FSFile file = new CFile(pathPrefix + FSFile.separator + item);
      
      if (file.getCanonicalFile().getAbsolutePath()
              .equals(currentOutputToIgnore)) {
        if (LOG)log("!!! FSFile is the current output (EXCLUDING): "
                + file.getAbsolutePath());
      } else {
        //if (this.checkIfExists(file)) {
          //if (LOG)log(">>> FSFile DOES exist: " + file.getAbsolutePath());
          try {
            in = file.getLineReader(this.getLineReaderCache());
            String line;
            if (LOG)log(">>> Merging: " + file.getAbsolutePath());
            while ((line = in.readLine()) != null) {
              //do include when not checking chunks or line is not ignored
              if (!checkLinesExcluded || !isLineIgnored(line)) {
                writer.append(line);
                writer.append(RET);
              } else if (isKeepLines()) {
                writer.append(RET);
              }
            }
          } catch (FileNotFoundException fnf) {
            if (LOG)log(">>> FSFile DOES NOT exist! Some of FSFile files may"
                  + " point to dependencies that do not match -s and"
                  + " --file-deps-prefix  directory! Use -vv and see "
                  + "whats missing.\n    FSFile failed to open: "
                  + file.getAbsolutePath());
          } finally {
            writer.flush();
            if (in != null) in.close();
          }
//        } else {
//          if (LOG)log(">>> FSFile DOES NOT exist! Some of FSFile files may"
//                  + " point to dependencies that do not match -s and"
//                  + " --file-deps-prefix  directory! Use -vv and see "
//                  + "whats missing.\n    FSFile failed to open: "
//                  + file.getAbsolutePath());
//        }
      }
    }
  }

  private final List<Processor> processors = new ArrayList<Processor>();
  /**
   * 
   * @param paths
   * @param checkLinesExcluded
   * @param outputName
   * @param wraps
   * @param defaultExtension
   * @return
   * @throws FileNotFoundException
   * @throws IOException 
   */
  public Map<String, StringBuilder> mergeFilesWithChunksAndStripFromWraps( 
        Map<String, String> paths,
        boolean checkLinesExcluded,
        String outputName,
        List<String> wraps,
        String defaultExtension)
        throws FileNotFoundException, IOException {
        
        if (defaultExtension == null) {
            defaultExtension = EMPTY;
        }
        
        Iterator<String> allPaths = paths.keySet().iterator();
                
        Map<String, StringBuilder> allChunks =
            new HashMap<String, StringBuilder>();
        
        while (allPaths.hasNext()) {
            String currentPath = allPaths.next();
            String dirBase = paths.get(currentPath);

            dirBase = new CFile(this.getCwd(), dirBase).getAbsolutePath();
            if (LOG)logVeryVerbosive(">>> Dir Base + Path : " + dirBase + " --> " + currentPath);
            LineReader in = null;
            String topDir = this.getTopAbsoluteParent(dirBase);
            String pathPrefix;

            if (currentPath.startsWith(topDir)) {
                pathPrefix = EMPTY;
            } else {
                pathPrefix = dirBase;
            }
            //no Cwd here!
            FSFile file = new CFile(pathPrefix, currentPath);

            if (file.getCanonicalFile().getAbsolutePath()
                .equals(outputName)) {
                if (LOG)log("!!! FSFile is the current output (EXCLUDING): "
                    + file.getAbsolutePath());
            } else {
        //if (this.checkIfExists(file)) {
                //if (LOG)log(">>> FSFile DOES exist: " + file.getAbsolutePath());
                try {
                    in = file.getLineReader(this.getLineReaderCache());
                    
                    String tmp;
                    List<String> lines = new ArrayList<String>();

                    while ((tmp = in.readLine()) != null) {
                        if (!checkLinesExcluded || !isLineIgnored(tmp)) {
                            lines.add(tmp);
                        } else if (isKeepLines()) {
                          lines.add(EMPTY);
                        }
                    }
                    
                    lines = MainProcessorHelper
                            .stripFromWraps(lines,
                                this.getFromToIgnore(),
                                isKeepLines() ? EMPTY : null);
                    
                    List<Object[]> chunks = 
                        MainProcessorHelper
                            .getFileInChunks(lines, wraps, defaultExtension);
                    
                    int idx = file.getName().lastIndexOf('.') + 1;
                    
                    if (idx != -1 && !this.getProcessors().isEmpty()) {
                        String ext = file.getName().substring(idx);
                        for (Processor proc : this.getProcessors()) {
                            proc.process(chunks, ext);
                        }
                    }
                    
                    for (Object[] chunk : chunks) {
                        String key = chunkToExtension((String) chunk[0]);
                        StringBuilder builder = allChunks.get(key);
                        if (builder == null) {
                            builder = new StringBuilder();
                            allChunks.put(key, builder);
                        }
                        builder.append((StringBuilder) chunk[1]);
                    }
                    
                    if (LOG)log(">>> Merging: " + file.getAbsolutePath());
                } catch (FileNotFoundException fnf) {
                    if (LOG)log(">>> FSFile DOES NOT exist! Some of FSFile files may"
                        + " point to dependencies that do not match -s and"
                        + " --file-deps-prefix  directory! Use -vv and see "
                        + "whats missing.\n    FSFile failed to open: "
                        + file.getAbsolutePath());
                } finally {
                    if (in != null) {
                        in.close();
                    }
                }
//        } else {
//          if (LOG)log(">>> FSFile DOES NOT exist! Some of FSFile files may"
//                  + " point to dependencies that do not match -s and"
//                  + " --file-deps-prefix  directory! Use -vv and see "
//                  + "whats missing.\n    FSFile failed to open: "
//                  + file.getAbsolutePath());
//        }
            }
        }
        
        return allChunks;
    }
  
    //chunks definitions must be valid
    public void writeOutputs(
        Map<String, StringBuilder> allChunks,
        String outputName,
        boolean clear) throws IOException {
//        if (clear) for (String chunkName : allChunks.keySet()) {
//            String chunkRawName = chunkToExtension(chunkName);
//            String currentOutputName = outputName + "." + chunkRawName;
//            if (chunkRawName.equals(EMPTY)) {
//                currentOutputName = outputName;
//            }
//            FSFile f = new CFile(currentOutputName);
//            if (f.exists()){
//                f.delete();
//            }
//        }

        for (String chunkName : allChunks.keySet ()) {
                StringBuilder chunk = allChunks.get(chunkName);
            String chunkRawName = chunkToExtension(chunkName);
            String currentOutputName = outputName + "." + chunkRawName;
            if (chunkRawName.equals(EMPTY)) {
                currentOutputName = outputName;
            }
            if (chunk != null && chunk.length() > 0) {
                BufferedWriter writer = null;
                try {
                    writer = new CFile(currentOutputName)
                        .getBufferedWriter(!clear);
                    writer.append(chunk);
                    writer.flush();
                } finally {
                    if (writer != null) writer.close();
                }
            }
        }
    }
    
  /**
   * Function getting dependencies map by using file as input.
   * 
   * @param paths
   * @param path
   * @param relative if true, paths to be returned are relative (as is in deps)
   * @param output
   * @return
   * @throws FileNotFoundException
   * @throws IOException
   */
  public LinkedHashMap<String, String>
          getFileDependenciesFromCFile(
              List<String> paths,
              boolean relative,
              String output)
          throws FileNotFoundException, IOException {
    return getFilesListFromFile(paths, relative, false, output);
  }

  public void clearCache () {
    helpingImportsMap.clear();
    helpingMap.clear();
    dependenciesChecked.clear();
    existingFiles.clear();
    prefixCacheForDetector.clear();
    cannonicalFilesCache.clear();
  }
          
  /**
   * Function getting dependencies map by using file as input.
   * 
   * @param pathsToCheck
   * @param relative if true return relative "as is" paths values
   * @param ignoreDependencies if true, do not search for dependencies 
 (allPaths has sense to use if input path is a directory)
   * @param currentOutput
   * @return
   * @throws FileNotFoundException
   * @throws IOException
   */
  public LinkedHashMap<String, String> getFilesListFromFile(
          List<String> pathsToCheck,
          boolean relative,
          boolean ignoreDependencies,
          String currentOutput)
          throws FileNotFoundException, IOException {
    //not lineReaderCache
    processed.clear();
    alreadyProcessed.clear();
    
    // path to file and base
    LinkedHashMap<String, String> paths = new LinkedHashMap<String, String>();
    LinkedHashMap<String, String> excludes = new LinkedHashMap<String, String>();
    
    Map<String, List<FSFile>> files = new HashMap<String, List<FSFile>>();
    List<String> sourceDirs = new ArrayList<String>(); // potential source bases
    
    for (String path : pathsToCheck) {
      FSFile startingFile = new CFile(getCwd(), path);
      List<FSFile> tmp = MainProcessor.listFilesTree(startingFile);
      files.put(path, tmp);

      if (startingFile.isFile()) {
        if (LOG) {
          log(">>> Dealing with file and not a directory.");
        }
        startingFile = startingFile.getParentFile();
      }
      sourceDirs.add(startingFile.getPath());
    }

    //check which match extensions set
    for (String keySet : files.keySet()) {
      List<FSFile> tmp = files.get(keySet);
      for (int i = 0; i < tmp.size(); i++) {
        FSFile f = tmp.get(i);
        if (!this.testIfFileIncluded(f)
            || f.getCanonicalFile().getAbsolutePath().equals(currentOutput)) {
          // do not include current startingFile
          if (LOG) {
            log("Excluded: " + f.getName() + " [src: " + keySet + " ]");
          }
          tmp.remove(i--);
        } else {
          //if (LOG)log("Excluded NOT: " + files.get(i).getName());
        }
      }
    }
    
    
    boolean checkIfFileExists = !this.isAssumeFilesExist();
    String[] srcs = this.getSourceBase();
    
    //directory option with unspecified src dir
    if ((srcs.length == 1
        && srcs[0] != null && srcs[0].trim().equals(EMPTY))
        || (srcs.length == 0)) {
      this.setSourceBase(sourceDirs.toArray(new String[]{}));
    }

    
    if (LOG)log("Ignoring dependencies is set to: " + ignoreDependencies);
    if (LOG)log("All paths below (imported and raw) must match same prefix:");

    String inputFileBaseDir = this.getSourceBase()[0];
    
    //this is a hash ensuring that no file duplicates will occure in dependencies
    //@TODO check where allPaths can be added
    for (String keySet : files.keySet()) {
      List<FSFile> tmp = files.get(keySet);
      for (FSFile file : tmp) {
        //if (LOG)log( files.get(i).getAbsolutePath());
        String dependencyPath = file.getAbsolutePath();
        //already in
        if (this.dependenciesChecked.containsKey(dependencyPath)) {
          continue;
        }
        //dont process current path, if any dependencies chain contains allPaths
        this.dependenciesChecked.put(dependencyPath, null);
        this.processFileDependencies(file,
                paths,
                excludes,
                relative,
                ignoreDependencies,
                checkIfFileExists,
                inputFileBaseDir, //starting dir!
                null);
      }
    }
    if (ignoreDependencies) {
      if (LOG)log(">>> Dependencies includes ignored !");
    }
    
    return paths;
  }
  private final Map<String, String> dependenciesChecked = new HashMap<String, String>();
  private boolean cacheFilesForMerge = false;
  private final HashMap<String,Boolean> processed = new HashMap<String, Boolean>();
  /**
   * The heart of file dependencies processing and searching loading.
   *
   * @param file
   * @param relative
   * @param ignoreDependencies
   * @return
   * @throws IOException
   */
  private boolean processFileDependencies(
          FSFile file,
          Map<String, String> paths,
          Map<String, String> excludes,
          boolean relative,
          boolean ignoreDependencies,
          boolean checkIfFilesExists,
          String dirBase,
          FSFile from) throws IOException {
//    file = file.getCanonicalCFile();
    
    if (processed.containsKey(file.getAbsolutePath())) {
      return false;
    }
    //do not process twice or more
    processed.put(file.getAbsolutePath(), true);
    
    //from is recursion parameter! dont use.
    if (from == null) {
      if (LOG) {
        this.setIndentLevel(0);
        logVeryVerbosive("Searching for dependencies in file " + file.getPath());
      }
    }
    
    String line;
    Object[] dependencyPathObject = null;//String, Type
    LineReader in = null;
    boolean excludeThisFile = false;
    boolean mayBePreProcessorLine = false;
    List<String[]> dependenciesPathsObjects;

    if (!ignoreDependencies) try {

    in = file.getLineReader(this.getLineReaderCache());
    line = in.readLine();
    
    // make sure its not excluded first line
    if (this.excludingFile(line)) {
      if (LOG)log(">>> FSFile \"" + file.getAbsolutePath()
              + "\" will be excluded by one of keywords exclusion, the line:"
              + line);
      excludeThisFile = true;
    }

    setIndentLevel(getIndentLevel() + 1);
    this.setCurrentIndent(multipleString("    ", getIndentLevel()));

    // check if we need dependencies

      if (from == null) {
        if (LOG)logVeryVerbosive("Initialising searching for dependencies for file:\n"
              + file.getPath());
      }
      //log(this.getCurrentIndent() + "FSFile: " + file.getPath());
      do {
        // check if line contains preprocessing words
        mayBePreProcessorLine = lineMayContainPreProcessor(line);
        dependencyPathObject = this.parseDependencyFromLine(line);
        dependenciesPathsObjects = this.getDependenciesPath(dependencyPathObject);
        String dependencyPathString = null;
        
        if (dependencyPathObject != null) {
            dependencyPathString = (String) dependencyPathObject[0];
        }
        
        if (dependencyPathObject != null
            && dependenciesPathsObjects != null
            && !this.dependenciesChecked.containsKey(dependencyPathString)) {
            for (String[] depsItem : dependenciesPathsObjects) {
                String[] dependenciesPaths = depsItem;
                //@TODO    add extension check also to included dependencies - OR
                // maybe leav allPaths and dependencies should not be filtered:
                //        this.testIfFileIncluded(files.get(i))
                if (LOG)logVeryVerbosive(
                    this.getCurrentIndent() + dependenciesPaths[0]
                    + " base: " + dependenciesPaths[1]
                    + ",  path: "
                    + ((String) dependencyPathObject[0]) + " (" +
                        "directive line: " + line + ")");

                FSFile tmp = new CFile(getCwd(), dependenciesPaths[0]);

                //do not analyse files already in paths
                if (!this.dependenciesChecked
                    .containsKey(tmp.getAbsolutePath())) {

                    //improve by marking by absolute path too
                    this.dependenciesChecked.put(tmp.getAbsolutePath(), null);

                    excludeThisFile = excludeThisFile
                        || processFileDependencies(
                                                  tmp,
                                                  paths,
                                                  excludes,
                                                  relative,
                                                  ignoreDependencies,
                                                  checkIfFilesExists,
                                                  dependenciesPaths[1],
                                                  file);

                    setIndentLevel(getIndentLevel() - 1);
                }
            }
        } else {
            if (dependencyPathObject != null && dependenciesPathsObjects == null) {
                //do not recheck!
                if (LOG)log(this.getCurrentIndent()
                    + ">>> !!! Dependency file could not be found, either file does "
                    + "not exist or source base is incorrect! dependency line: "
                    + line + " : " + ((String)dependencyPathObject[0]));
            }
        }

        this.dependenciesChecked.put(dependencyPathString, null);//////

        line = in.readLine();

        //check every line
        if (this.excludingFile(line)) {
            if (LOG)log(">>> FSFile \"" + file.getAbsolutePath()
                + "\" will be excluded by one of keywords exclusion,"
                + " the line:"
                + line);
            excludeThisFile = true;
        }
          //till not excluded, still have lines or are still preprocessor lines.
          // by default all lines are treated as preprocessor,
          // see: checkEveryLine          
      } while (!excludeThisFile && mayBePreProcessorLine && line != null);

      if (from == null) {
        this.setIndentLevel(0);
        this.setCurrentIndent(EMPTY);
        if (LOG)logVeryVerbosive("Finished processing dependencies."
                + file.getPath());
      }
    } catch (FileNotFoundException ex) {
      if (LOG)log(this.getCurrentIndent()
              + ">>> !!! FSFile not found, either file does "
              + "not exist or source base is incorrect! PATH: "
              + file.getPath() + "\n Exception: \n");
      if (LOG)log(ex.getMessage());

    } finally {
      if (in != null) {
        in.close();
      }
    }

    //Adding current file...
    this.addOrExcludeFileFromPathsListSingle(excludeThisFile,
            excludes,
            file,
            paths,
            relative,
            checkIfFilesExists,
            dirBase,
            from);
    return false;
  }

  /**
   * Multiply input string given amount of times
   * @param string
   * @param amount
   * @return string concat of values
   */
  public static String multipleString(String string, int amount) {
    StringBuilder stringBuilder = new StringBuilder();
    for (int i = 0; i < amount; i++) {
      stringBuilder.append(string);
    }
    return stringBuilder.toString();
  }
  
  private final HashMap<String, Boolean> alreadyProcessed = new HashMap<String, Boolean>();
  
  
  Map<String, FSFile> cannonicalFilesCache = new HashMap<String, FSFile>();

  /**
   * Private function handling addng/queueing elements to the paths linked map.
   * It  also registers already excluded elements.
   * It is mostly used by processFileDependencies.
   * 
   * @param excludeThisFile
   * @param excludes
   * @param file
   * @param paths
   * @param relative
   * @param checkIfFilesExists
   * @param dirBase
   * @param from
   * @throws IOException 
   */
  private void addOrExcludeFileFromPathsListSingle(
          boolean excludeThisFile,
          Map<String, String> excludes,
          FSFile file,
          Map<String, String> paths,
          boolean relative,
          boolean checkIfFilesExists,
          String dirBase,
          FSFile from) throws IOException {
    
    //FSFile originalFile = file;
    file = file.getCanonicalFile();
    String fileAbsPath = file.getAbsolutePath();
    
    if (alreadyProcessed.containsKey(fileAbsPath)) {
      return;
    }
    alreadyProcessed.put(fileAbsPath, true);
    
    String tmp;
    FSFile srcBase; //or "." ?
    //cache
    FSFile found = cannonicalFilesCache.get(dirBase);
    if (found != null) {
      srcBase = found;
    } else {
      srcBase = new CFile(getCwd(), dirBase); //or "." ?
      //make sure we have straight paths (not a/b/../b/c for example)
      //all relative paths are versus src base
      srcBase = srcBase.getCanonicalFile();
      cannonicalFilesCache.put(dirBase, srcBase);
    }
    
    String prefix = srcBase.getAbsolutePath() + CFile.separator;
    
    if (excludeThisFile) {
      //dont add but queue allPaths in excludes for future ignores
      if (relative) {
        Object[] results
            = detectDirectoryPrefix(fileAbsPath, srcBase, dirBase, prefix);
        tmp = (String) results[0];
        dirBase = (String) results[1];
//        prefix = (String) results[2]; //never used
        excludes.put(tmp, dirBase);
      } else {
        excludes.put(tmp = fileAbsPath, dirBase);
      }
      if (LOG)log("EXCLUDED path : " + tmp);
    } else {
      boolean addToPaths = true;
      if (checkIfFilesExists) {
        if (!this.checkIfExists(file)) {
          addToPaths = false;
          if(LOG)log("By check if exist: FSFile does not exist. "+fileAbsPath);
        }
      }
      
      if (addToPaths) {
        String path = null;
        
        if (relative) {
          Object[] results = 
              detectDirectoryPrefix(fileAbsPath, srcBase, dirBase, prefix);
          path = (String) results[0];
          dirBase = (String) results[1];
          prefix = (String) results[2];
        } else {
          path = fileAbsPath;
        }
        
        boolean added = false;
        
        if (!paths.containsKey(path)) {
          added = this.addPath(
            paths,
            tmp = path,
            excludes,
            dirBase);
        
          if (added) {
            if (LOG)log(this.getCurrentIndent()
                    + ">>> Queued current path (total:"
                    + paths.size()
                    + ", base:" + dirBase
                    + " , relative:" + relative + ")   : "
                    + tmp + " [ src base related: " + prefix + "]"
                    //  +"     Absolute: " + fileAbsPath
                    + "     From: "
                    + ((from != null) ? from.getPath()
                    : "Direct listing - not as a dependency."));

          }
        } else {
          if (LOG)logVeryVerbosive(this.getCurrentIndent()
                  + ">>> Already queued path (total:"
                  + paths.size()
                  + ", base: " + paths.get(path)
                  + " , relative:" + relative + ")   : "
                  + path + " [ src base related: " + prefix + "]"
                  //  +"     Absolute: " + fileAbsPath
                  + "     From: "
                  + ((from != null) ? from.getPath()
                  : "Direct listing - not as a dependency."));
        }
      }
    }
  }
  
  Map<String, String> prefixCacheForDetector = new HashMap<String, String>();
  /*
   * Useful at index generation.
   * @param fileAbsPath
   * @param srcBase
   * @param dirBase
   * @param prefix
   * @return
   * @throws IOException 
   */
  private Object[] detectDirectoryPrefix (
      String fileAbsPath,
      FSFile srcBase,
      String dirBase,
      String prefix) throws IOException {
    //optimisticly ends here
    String path = fileAbsPath.replace(prefix, EMPTY);
    if (fileAbsPath.equals(path)) {
      for (String item : this.getSourceBase()) {
        String found = prefixCacheForDetector.get(item);
        String nprefix;
        if (found != null) {
          nprefix = found;
        } else {
          srcBase = new CFile(getCwd(), item).getCanonicalFile();
          nprefix = srcBase.getAbsolutePath() + CFile.separator;
          prefixCacheForDetector.put(item, nprefix);
        }
        
        path = fileAbsPath.replace(nprefix, EMPTY);
        if (!fileAbsPath.equals(path)) {
          dirBase = item;
          prefix = nprefix;
          break;
        }
      }
    }
    return new Object[]{path, dirBase, prefix};
  }
  /**
   * Function adding path with base dir to the specified map of paths.
   * It will check if allPaths is contained by excludes map and ignore allPaths 
 if contained.
   * @param where
   * @param path
   * @param excludes
   * @param base
   * @return 
   */
  private boolean addPath(
          Map<String, String> where,
          String path,
          Map<String, String> excludes,
          String base) {
    if (!excludes.containsKey(path)) {
      where.put(path, base);
      return true;
    }
    return false;
  }

  /**
   * @deprecated
   * Function detecting if line is suspected to contain preprocessing contents:
   * //, /*, #, <! ;
   * @param line
   * @return
   */
  private boolean lineMayContainPreProcessor(String line) {
    if (this.isCheckEveryLine()) {
      return true;
    }
    if (line == null) return false;
    
    if (line.length() < 3) return false;
    
    line = line.trim();
    
    char ch = line.charAt(0);
    if (ch != '/' && ch != '#' && ch != '<' && ch != ';') return false;
    
    return    (line.startsWith("//")
            || line.startsWith("/*")
            || line.startsWith("##")
            || line.startsWith("<!")
            || line.startsWith(";"));
  }
    
  /* GETTERS AND SETTERS */
  /**
   * @return the ignores
   */
  public String[] getIgnores() {
    return ignores;
  }

  /**
   * @param ignores the ignores to set
   */
  public void setIgnores(String[] ignores) {
    this.ignores = ignores;
  }

  /**
   * @return the mergeOnly
   */
  public String[] getMergeOnly() {
    return mergeOnly;
  }

  /**
   * @param mergeOnly the mergeOnly to set
   */
  public void setMergeOnly(String[] mergeOnly) {
    this.mergeOnly = mergeOnly;
  }

  /**
   * @return the fromToIgnore
   */
  public String[] getFromToIgnore() {
    return fromToIgnore;
  }

  /**
   * @param fromToIgnore the fromToIgnore to set
   */
  public void setFromToIgnore(String[] fromToIgnore) {
    this.fromToIgnore = fromToIgnore;
  }

  /**
   * @return the ignoreRequire
   */
  public boolean isIgnoreRequire() {
    return ignoreRequire;
  }

  /**
   * @param ignoreRequire the ignoreRequire to set
   */
  public void setIgnoreRequire(boolean ignoreRequire) {
    this.ignoreRequire = ignoreRequire;
  }

  /**
   * @return the fileIgnores
   */
  public String[] getFileIgnores() {
    return fileIgnores;
  }

  /**
   * @param fileIgnores the fileIgnores to set
   */
  public void setFileIgnores(String[] fileIgnores) {
    this.fileIgnores = fileIgnores;
  }

  /**
   * @return the checkEveryLine
   */
  public boolean isCheckEveryLine() {
    return checkEveryLine;
  }

  /**
   * @param checkEveryLine the checkEveryLine to set
   */
  public void setCheckEveryLine(boolean checkEveryLine) {
    this.checkEveryLine = checkEveryLine;
  }

  /**
   * @return the currentIndent
   */
  public String getCurrentIndent() {
    if (this.isIgnoringIndents() || !this.isVeryVerbosive()) {
      return EMPTY;
    }
    return currentIndent;
  }

  /**
   * @param currentIndent the currentIndent to set
   */
  public void setCurrentIndent(String currentIndent) {
    this.currentIndent = currentIndent;
  }

  /**
   * @return the ignoringIndents
   */
  public boolean isIgnoringIndents() {
    return ignoringIndents;
  }

  /**
   * @param ignoreIndents the ignoringIndents to set
   */
  public void setIgnoringIndents(boolean ignoreIndents) {
    this.ignoringIndents = ignoreIndents;
  }

  /**
   * @return the veryVerbosive
   */
  public boolean isVeryVerbosive() {
    return veryVerbosive;
  }

  /**
   * @param veryVerbosive the veryVerbosive to set
   */
  public void setVeryVerbosive(boolean veryVerbosive) {
    this.veryVerbosive = veryVerbosive;
  }

  /**
   * @return the indentLevel
   */
  public int getIndentLevel() {
    return indentLevel;
  }

  /**
   * @param indentLevel the indentLevel to set
   */
  public void setIndentLevel(int indentLevel) {
    this.indentLevel = indentLevel;
  }
}
