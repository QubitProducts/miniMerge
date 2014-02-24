/*
 *  Copyright 2013 @ QubitProducts.com
 *
 *  MiniMerge is free software: you can redistribute it and/or modify
 *  it under the terms of the Lesser GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  MiniMerge is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  Lesser GNU General Public License for more details.
 *
 *  You should have received a copy of the Lesser GNU General Public License.
 *  If not, see LGPL licence at http://www.gnu.org/licenses/lgpl-3.0.html.
 */
package com.qubitproducts.minimerge;

import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.File;
import java.io.FileNotFoundException;
import java.io.FileReader;
import java.io.FileWriter;
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

/**
 *
 * @author Peter (Piotr) Fronc <peter.fronc@qubitproducts.com>
 */
public class MiniProcessor {

  private static final Logger LOGGER =
          Logger.getLogger(MiniProcessor.class.getName());
  static public LogLevel LOG_LEVEL = LogLevel.DEFAULT;

  /*
   * simple custom console logger
   */
  public static void log(String msg) {
    switch (LOG_LEVEL) {
      case ALL:
        System.out.println(msg);
        LOGGER.fine(msg);
        break;
      case NONE:
        break;
      case FINE:
        LOGGER.fine(msg);
        break;
      default:
        System.out.println(msg);
    }
  }
  
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
  
  boolean ignoreAllIgnores = false;//@TODO implement
  private String[] ignores = null;
  private String[] mergeOnly = null;
  private String[] sourceBase = {""};
  private String[] fromToIgnore = null;
  private String currentOutput = null;
  private boolean ignoreRequire = false;
  private boolean checkEveryLine = true;
  private String currentIndent = "";
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
    for (int i = 0; i < this.getFileIgnores().length; i++) {
      String matcher = this.getFileIgnores()[i];
      if (matcher != null && matcher.length() > 0 && line.startsWith(matcher)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Resolves a dependency path from given string line. If line contains
   * //:include file.txt file.txt will be returned. If line contains //=require
   * <file>
   * the file.js will be returned (requirejs support)
   *
   * @param {java.lang.String } line string to be parsed
   * @return {java.lang.String} dependency string or null if not found.
   */
  private String parseDependencyFromLine(String line) {
    String addedPath = null;
    if ((!isIgnoreRequire()) && (line != null) && (line.startsWith("//= "))) {
      addedPath = MiniProcessorHelper.getRequirePath(line) + ".js";
    } else if ((line != null) && line.startsWith("//:include ")) {
      addedPath = getNormalPath(line);
    }
    return addedPath;
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
      String srcBase = new File(sourceBase[i]).getPath();
      srcBase = srcBase + File.separator;
      srcs.add(srcBase);
      logVeryVerbosive("Source No. " + i + " base set to: " + srcBase);
    }
    this.sourceBase = srcs.toArray(new String[0]);
  }

  /**
   * Function finds dependency path depending on input specified and
   * sourceBase array. It returns null if none of matched paths corresponds
   * to existing file.
   * It constructs paths by prefixing dependencyPathString with all sourceBase
   * paths and checking if any of paths is a file - if yes, the tested path is
   * returned and its base.
   * 
   * @param String dependency to be checked
   * @return Array of strings with path at 0 index and
   * source base at 1 index if dependency exists or null otherwise.
   */
  public String[] getDependenciesPath(String dependencyPathString) {
    String[] dirs = this.getSourceBase();
    for (int i = 0; i < dirs.length; i++) {
      String path = this.getSourceBase()[i] + dependencyPathString;
      if (new File(path).exists()) {
        return new String[]{path, dirs[i]};
      }
    }
    return null;
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
   * Log levels, Deafault and fine are {System.out.println} based. FINE is java
   * logger at FINE level.
   */
  static public enum LogLevel {
    ALL,
    NONE,
    FINE,
    DEFAULT
  }
  
  /**
   * Default strings used to specify lines ignored during merge.
   */
  protected String[] IGNORE = {
    "/*D*/",
    "//=",
    "//:include",
    "//= require"
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
    "/*~debug*/", "/*~*/"
  };

  /**
   * MiniProcessor class constructor. It accepts String as a argument - path to
   * output file.
   *
   * @param output java.lang.String path to output file
   */
  public MiniProcessor(String output) {
    this.currentOutput = new File(output).getAbsolutePath();
    this.ignores = IGNORE;
    this.mergeOnly = EXT_TO_MERGE;
    this.fromToIgnore = FROM_TO_IGNORE;
  }

  /**
   * Function listing recursively entire files tree. Similar to plain find in
   * UNIX.
   *
   * @param startingFile java.io.File File specifying tree root node (mostly a
   * directory).
   * @return List list of files.
   */
  public static List<File> listFilesTree(File file) {
    ArrayList<File> results = new ArrayList();
    if (!file.isDirectory()) {
      results.add(file);
    } else {
      File[] files = file.listFiles();
      if (files != null) {
        for (int i = 0; i < files.length; i++) {
          if (files[i].isFile()) {
            results.add(files[i]);
          } else {
            List<File> subdir = listFilesTree(files[i]);
            results.addAll(subdir);
          }
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
    for (int i = 0; i < this.getIgnores().length; i++) {
      String matcher = this.getIgnores()[i];
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
  protected boolean testIfFileIncluded(File test) {
    String[] strings = this.getMergeOnly();
    for (int i = 0; i < strings.length; i++) {
      if (strings[i].equals("*") ||
              test.getName().endsWith(this.getMergeOnly()[i])) {
        if (this.getFileExcludePatterns() != null) {
          for(String match : this.getFileExcludePatterns()) {
            if (test.getName().matches(match)) {
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
   * @return String buffer as output of the merge process
   * @throws FileNotFoundException
   * @throws IOException
   */
  public StringBuffer mergeFiles(Map<String, String> paths)
          throws FileNotFoundException, IOException {
    StringBuffer sb = this.mergeFiles(paths, false);

    BufferedReader sr = new BufferedReader(new StringReader(sb.toString()));

    StringWriter sw = new StringWriter();
    BufferedWriter bw = new BufferedWriter(sw);

    MiniProcessorHelper.stripFromWraps(sr, bw, this.getFromToIgnore());
    return sw.getBuffer();
  }

  /**
   * Function merging files content by given paths map in the order 
   * defined by the map implementation.
   * 
   * @param paths map
   * @param checkLinesExcluded should merging check if lines are ignored
   * if true, this function will check each line if must be ignored by 
   * using function @see:isLineIgnored
   * @param path to file where to write output
   * @throws IOException
   */
  public void mergeFilesToFile(
                  Map<String, String> paths,
                  boolean checkLinesExcluded,
                  String outputFile
          ) throws IOException {
    this.setCurrentOutput((new File(outputFile)).getCanonicalFile().getAbsolutePath());
    BufferedWriter writer = new BufferedWriter(
            new FileWriter((new File(outputFile))));
    mergeFiles(paths, checkLinesExcluded, writer);
    try {
      log(">>> Stripping file: " + outputFile);
      MiniProcessorHelper
              .stripFileFromWraps(new File(outputFile), this.getFromToIgnore());
    } catch (FileNotFoundException ex) {
      Logger.getLogger(MiniProcessor.class.getName()).log(Level.SEVERE, null, ex);
    } catch (Exception ex) {
      Logger.getLogger(MiniProcessor.class.getName()).log(Level.SEVERE, null, ex);
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
   * @return output string buffer
   * @throws FileNotFoundException
   * @throws IOException
   */
  public StringBuffer mergeFiles(
              Map<String, String> paths,
              boolean checkLinesExcluded)
          throws FileNotFoundException, IOException {
    StringWriter writer = new StringWriter();
    this.mergeFiles(paths, checkLinesExcluded, writer);
    return writer.getBuffer();
  }

  /**
   * Absolute file system root directory getter for given path..
   * @param path
   * @return
   */
  public static String getTopAbsoluteParent(String path) {
    File file = new File(new File(path + "anystring").getAbsolutePath());
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
   * @param paths map
   * @param checkLinesExcluded should merging check if lines are ignored
   * if true, this function will check each line if must be ignored by 
   * using function @see:isLineIgnored
   * @param writer where to write output
   * @throws FileNotFoundException
   * @throws IOException
   */
  public void mergeFiles(
              Map<String, String> paths,
              boolean checkLinesExcluded,
              Writer writer)
          throws FileNotFoundException, IOException {
    Iterator<String> it = paths.keySet().iterator();
    while (it.hasNext()) {
      String item = it.next();
      String dirBase = paths.get(item);

      logVeryVerbosive(">>> Dir base: " + dirBase);
      dirBase = new File(dirBase).getAbsolutePath();
      BufferedReader in = null;
      String topDir = getTopAbsoluteParent(dirBase);
      String pathPrefix;
      
      if (item.startsWith(topDir)) {
        pathPrefix = "";
      } else {
        pathPrefix = dirBase;
      }
      File file = new File(pathPrefix + File.separator + item);
      if (file.getCanonicalFile().getAbsolutePath()
              .equals(this.getCurrentOutput())) {
        log("!!! File is the current output (EXCLUDING): "
                + file.getAbsolutePath());
      } else {
        if (file.exists()) {
          //log(">>> File DOES exist: " + file.getAbsolutePath());
          try {
            in = new BufferedReader(new FileReader(file));
            String line;
            log(">>> Merging: " + file.getAbsolutePath());
            while ((line = in.readLine()) != null) {
              //do include when not checking chunks or line is not ignored
              if (!checkLinesExcluded || !isLineIgnored(line)) {
                writer.append(line);
              }
              writer.append("\n");
            }
          } finally {
            writer.flush();
            in.close();
          }
        } else {
          log(">>> File DOES NOT exist ! Some of File files may"
                  + " point to dependencies that do not match -s and"
                  + " --file-deps-prefix  directory! Use -vv and see "
                  + "whats missing.\n    File failed to open: "
                  + file.getAbsolutePath());
        }
      }
    }
  }

  /**
   * Function getting dependencies map by using file as input.
   * 
   * @param path
   * @param relative if true, paths to be returned are relative (as is in deps)
   * @return
   * @throws FileNotFoundException
   * @throws IOException
   */
  public LinkedHashMap<String, String>
          getFileDependenciesFromFile(String path, boolean relative)
          throws FileNotFoundException, IOException {
    return getFilesListFromFile(path, relative, false);
  }

  /**
   * Function getting dependencies map by using file as input.
   * 
   * @param path path to root file
   * @param relative if true return relative "as is" paths values
   * @param ignoreDependencies if true, do not search for dependencies 
   * (it has sense to use if input path is a directory)
   * @return
   * @throws FileNotFoundException
   * @throws IOException
   */
  public LinkedHashMap<String, String> getFilesListFromFile(
          String path,
          boolean relative,
          boolean ignoreDependencies)
          throws FileNotFoundException, IOException {
    
    LinkedHashMap<String, String> paths = new LinkedHashMap<String, String>();
    LinkedHashMap<String, String> excludes = new LinkedHashMap<String, String>();
    
    File startingFile = new File(path);
    
    List<File> files = MiniProcessor.listFilesTree(startingFile);

    //is this not a directory???
    boolean isFile = startingFile.isFile();
    if (isFile) {
      log(">>> Dealing with file and not a directory.");
      startingFile = startingFile.getParentFile();
    }

    //check which match extensions set
    for (int i = 0; i < files.size(); i++) {
      if (!this.testIfFileIncluded(files.get(i))
              || files.get(i).getCanonicalFile().getAbsolutePath()
              .equals(this.getCurrentOutput())) {
        // do not include current startingFile
        log("Excluded: " + files.get(i).getName());
        files.remove(i--);
      } else {
        //log("Excluded NOT: " + files.get(i).getName());
      }
    }
    
    boolean checkIfExists = true;
    
    String[] srcs = this.getSourceBase();
    
    //directory option with unspecified src dir
    if (    (!isFile 
              && srcs.length == 1 
              && srcs[0].equals("")) ||
            (
              srcs.length == 0
            )
       ) {
      this.setSourceBase(new String[]{startingFile.getPath()});
    }

    log("Ignoring dependencies is set to: " + ignoreDependencies);
    log("All paths below (imported and raw) must match same prefix:");

    String inputFileBaseDir = this.getSourceBase()[0];
    
    for (int i = 0; i < files.size(); i++) {
      //log( files.get(i).getAbsolutePath());
      this.processFileDependencies(
              files.get(i),
              paths,
              excludes,
              relative,
              ignoreDependencies,
              checkIfExists,
              inputFileBaseDir, //starting dir!
              null);
    }

    if (ignoreDependencies) {
      log(">>> Dependencies includes ignored !");
    }

    return paths;
  }
  private Map<String, String> dependenciesChecked =
          new HashMap<String, String>();

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
          File file,
          Map<String, String> paths,
          Map<String, String> excludes,
          boolean relative,
          boolean ignoreDependencies,
          boolean checkIfFilesExists,
          String sourceBase,
          File from) throws IOException {
    //from is recursion parameter! dont use.
    if (from == null) {
      this.dependenciesChecked.clear();
      this.setIndentLevel(0);
      logVeryVerbosive("Searching for dependencies in file ");
    }

    String line, dependencyPathString = null;
    BufferedReader in = null;
    boolean excludeThisFile = false;
    boolean mayBePreProcessorLine = false;
    String[] dependencyPath;

    try {
      in = new BufferedReader(new FileReader(file));
      line = in.readLine();
      // make sure its not excluded first
      if (this.excludingFile(line)) {
        log(">>> File \"" + file.getAbsolutePath()
                + "\" will be excluded by one of keywords exclusion, the line:"
                + line);
        excludeThisFile = true;
      }

      setIndentLevel(getIndentLevel() + 1);
      this.setCurrentIndent(multipleString("    ", getIndentLevel()));

      // check if we need dependencies
      if (!ignoreDependencies) {
        if (from == null) {
          logVeryVerbosive("Initialising searching for dependencies for file:\n"
                  + file.getPath());
        }
        //log(this.getCurrentIndent() + "File: " + file.getPath());
        do {
          // check if line contains preprocessing words
          mayBePreProcessorLine = lineMayContainPreProcessor(line);
          dependencyPathString = this.parseDependencyFromLine(line);
          dependencyPath = this.getDependenciesPath(dependencyPathString);
          
          if (dependencyPathString != null
                  && dependencyPath != null
                  && !this.dependenciesChecked
                    .containsKey(dependencyPath[0])) {
            
            logVeryVerbosive(this.getCurrentIndent() + dependencyPath[0]
                + " base: " + dependencyPath[1]
                + ",  (original text: " + dependencyPathString + ")");

            File tmp = new File(dependencyPath[0]);

            if (!this.dependenciesChecked
                    .containsKey(tmp.getAbsolutePath())) {
              //improve by marking by absolute path too
              this.dependenciesChecked.put(tmp.getAbsolutePath(), null);
              excludeThisFile = excludeThisFile || processFileDependencies(
                      tmp,
                      paths,
                      excludes,
                      relative,
                      ignoreDependencies,
                      checkIfFilesExists,
                      dependencyPath[1],
                      file);
              setIndentLevel(getIndentLevel() - 1);
            }
          } else {
            if (dependencyPathString != null && dependencyPath == null) {
              //do not recheck!
              this.dependenciesChecked.put(dependencyPathString, null);
              log(this.getCurrentIndent()
                + ">>> !!! Dependency file could not be found, either file does "
                + "not exist or source base is incorrect! dependency line: "
                + line);
            }
          }
          
          line = in.readLine();
          
          //check every line
          if (this.excludingFile(line)) {
            log(">>> File \"" + file.getAbsolutePath()
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
          this.setCurrentIndent("");
          logVeryVerbosive("Finished processing dependencies."
                  + file.getPath());
        }
      }
    } catch (FileNotFoundException ex) {
      log(this.getCurrentIndent()
              + ">>> !!! Dependency file not found, either file does "
              + "not exist or source base is incorrect! PATH: "
              + file.getPath());

    } finally {
      if (in != null) {
        in.close();
      }
    }

    //Adding current file...
    this.addOrExcludeFileFromPathsListSingle(
            excludeThisFile,
            excludes,
            file,
            paths,
            relative,
            checkIfFilesExists,
            sourceBase,
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
          File file,
          Map<String, String> paths,
          boolean relative,
          boolean checkIfFilesExists,
          String dirBase,
          File from) throws IOException {
    
    String tmp;
    File srcBase = new File(dirBase); //or "." ?
    //make sure we have straight paths (not a/b/../b/c for example)
    //all relative paths are versus src base
    srcBase = srcBase.getCanonicalFile();
    file = file.getCanonicalFile();
    String prefix = srcBase.getAbsolutePath() + File.separator;
    if (excludeThisFile) {
      //dont add but queue it in excludes for future ignores
      if (relative) {
        excludes.put(tmp = file.getAbsolutePath().replace(prefix, ""), dirBase);
      } else {
        excludes.put(tmp = file.getAbsolutePath(), dirBase);
      }
      log("EXCLUDED path         : " + tmp);
    } else {
      boolean addToPaths = true;
      if (checkIfFilesExists) {
        if (!file.exists()) {
          addToPaths = false;
          log("By check if exist: File do not exist. "
                  + file.getAbsolutePath());
        }
      }
      if (addToPaths) {
        boolean added = false;
        if (relative) {
          added = this.addPath(paths,
                  tmp = file.getAbsolutePath().replace(prefix, ""),
                  excludes,
                  dirBase);
        } else {
          added = this.addPath(paths,
                  tmp = file.getAbsolutePath(),
                  excludes,
                  dirBase);
        }
        if (added) {
          log(this.getCurrentIndent()
                  + ">>> Queued current path (total:"
                  + paths.size()
                  + ", base:" + dirBase
                  + " , relative:" + relative + ")   : "
                  + tmp + " [ src base related: " + prefix + "]"
                  //  +"     Absolute: " + file.getAbsolutePath()
                  + "     From: "
                  + ((from != null) ? from.getPath()
                  : "DIRECT LISTING - NOT AS DEPENDENCY"));
          
        }
      }
    }
  }

  /**
   * Function adding path with base dir to the specified map of paths.
   * It will check if it is contained by excludes map and ignore it 
   * if contained.
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
    if (line != null
            && (line.startsWith("//")
            || line.startsWith("/*")
            || line.startsWith("#")
            || line.startsWith("<!")
            || line.startsWith(";"))) {
      return true;
    }
    return false;
  }

  /**
   * Include dependency directive cleaner.
   * Cleans //:include string and returns path only.
   * @param string
   * @return plain path
   */
  static String getNormalPath(String string) {
    return string.replaceFirst("//:include", "").trim();
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
   * @return the currentOutput
   */
  public String getCurrentOutput() {
    return currentOutput;
  }

  /**
   * @param currentOutput the currentOutput to set
   */
  public void setCurrentOutput(String currentOutput) {
    this.currentOutput = currentOutput;
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
      return "";
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
   * @param ignoringIndents the ignoringIndents to set
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
