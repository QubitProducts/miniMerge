/*
 *  Copyright 2013 @ QubitProducts.com
 *
 *  CompileJS is free software: you can redistribute it and/or modify
 *  it under the terms of the Lesser GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  CompileJS is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  Lesser GNU General Public License for more details.
 *
 *  You should have received a copy of the Lesser GNU General Public License.
 *  If not, see LGPL licence at http://www.gnu.org/licenses/lgpl-3.0.html.
 */
package com.qubitproducts.minimerge;

import static com.qubitproducts.minimerge.MiniProcessorHelper.chunkToExtension;
import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.File;
import java.io.FileNotFoundException;
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
  private String cwd = null;
  boolean ignoreAllIgnores = false;//@TODO implement
  private String[] ignores = null;
  private String[] mergeOnly = null;
  private String[] sourceBase = {""};
  private String[] fromToIgnore = null;
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
    if ((line != null) && line.startsWith("//:include ")) {
      addedPath = getNormalPath(line);
    } else if ((!isIgnoreRequire()) && (line != null) && (line.startsWith("//= "))) {
      addedPath = MiniProcessorHelper.getRequirePath(line) + ".js";
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
      String srcBase = new File(getCwd(), sourceBase[i]).getPath();
      srcBase = srcBase + File.separator;
      srcs.add(srcBase);
      logVeryVerbosive("Source No. " + i + " base set to: " + srcBase);
    }
    this.sourceBase = srcs.toArray(new String[0]);
  }

  private HashMap<String,String> helpingMap = new HashMap<String, String>();
  /**
   * Function finds dependency path depending on input specified and
   * sourceBase array. It returns null if none of matched paths corresponds
   * to existing file.
   * It constructs paths by prefixing dependencyPathString with all sourceBase
   * paths and checking if any of paths is a file - if yes, the tested path is
   * returned and its base.
   * 
   * 
   * @param dependencyPathString dependencyPathString to be checked
   * @return Array of strings with path at 0 index and
   * source base at 1 index if dependency exists or null otherwise.
   */
  public String[] getDependenciesPath(String dependencyPathString) {
    if (dependencyPathString != null) {
      String[] dirs = this.getSourceBase();
      if (dirs.length == 1) {  
        if (this.isAssumeFilesExist()) {
          String path = dirs[0] + dependencyPathString;
          helpingMap.put(path, null);
          return new String[]{path, dirs[0]};
        }
      }
      for (String dir : dirs) {
        String path = dir + dependencyPathString;
        //@todo - adding virtual paths??? so fir single repo virtual path is listed?
        if (helpingMap.containsKey(path) ||
                this.checkIfExists(new File(getCwd(), path))) {
          helpingMap.put(path, null);
          return new String[]{path, dir};
        }
      }
    }
    return null;
  }

  private boolean assumeFilesExist = false;
  private HashMap<String, Boolean> existingFiles = 
          new HashMap<String, Boolean>();
  private boolean checkIfExists (File file) {
    Boolean exists = existingFiles.get(file.getAbsolutePath());
    if (exists == null) {
      exists = file.exists();
      existingFiles.put(file.getAbsolutePath(), exists);
      return exists;
    } else if (exists == true) {
      return true;
    } else {
      return false;
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
  public MiniProcessor() {
    this.ignores = IGNORE;
    this.mergeOnly = EXT_TO_MERGE;
    this.fromToIgnore = FROM_TO_IGNORE;
  }

  /**
   * Function listing recursively entire files tree. Similar to plain find in
   * UNIX.
   *
   * @param file  java.io.File File specifying tree root node (mostly a
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
        for (File file1 : files) {
          if (file1.isFile()) {
            results.add(file1);
          } else {
            List<File> subdir = listFilesTree(file1);
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
  public StringBuffer mergeFiles(Map<String, String> paths, String output)
          throws FileNotFoundException, IOException {
    StringBuffer sb = this.mergeFiles(paths, false, output);

    BufferedReader sr = new BufferedReader(new StringReader(sb.toString()));

    StringWriter sw = new StringWriter();
    BufferedWriter bw = new BufferedWriter(sw);
    try {
      MiniProcessorHelper.stripFromWraps(sr, bw, this.getFromToIgnore());
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
    public void mergeFilesToFile(
        Map<String, String> paths,
        boolean checkLinesExcluded,
        String outputFile
    ) throws IOException {
        BufferedWriter writer = new BufferedWriter(
            new FileWriter((new File(outputFile))));
        try {
            mergeFiles(paths, checkLinesExcluded, writer, outputFile);
        } finally {
            writer.close();
        }
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
    File file = new File(new File(
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

      dirBase = new File(this.getCwd(), dirBase).getAbsolutePath();
      logVeryVerbosive(">>> Dir Base + Path : " + dirBase + " --> " + item);
      LineReader in = null;
      String topDir = this.getTopAbsoluteParent(dirBase);
      String pathPrefix;
      
      if (item.startsWith(topDir)) {
        pathPrefix = "";
      } else {
        pathPrefix = dirBase;
      }
      //no Cwd here!
      File file = new File(pathPrefix + File.separator + item);
      
      if (file.getCanonicalFile().getAbsolutePath()
              .equals(currentOutputToIgnore)) {
        log("!!! File is the current output (EXCLUDING): "
                + file.getAbsolutePath());
      } else {
        //if (this.checkIfExists(file)) {
          //log(">>> File DOES exist: " + file.getAbsolutePath());
          try {
            in = new LineReader(file);
            String line;
            log(">>> Merging: " + file.getAbsolutePath());
            while ((line = in.readLine()) != null) {
              //do include when not checking chunks or line is not ignored
              if (!checkLinesExcluded || !isLineIgnored(line)) {
                writer.append(line);
              }
              writer.append("\n");
            }
          } catch (FileNotFoundException fnf) {
            log(">>> File DOES NOT exist! Some of File files may"
                  + " point to dependencies that do not match -s and"
                  + " --file-deps-prefix  directory! Use -vv and see "
                  + "whats missing.\n    File failed to open: "
                  + file.getAbsolutePath());
          } finally {
            writer.flush();
            if (in != null) in.close();
          }
//        } else {
//          log(">>> File DOES NOT exist! Some of File files may"
//                  + " point to dependencies that do not match -s and"
//                  + " --file-deps-prefix  directory! Use -vv and see "
//                  + "whats missing.\n    File failed to open: "
//                  + file.getAbsolutePath());
//        }
      }
    }
  }

  private final List<Processor> processors = new ArrayList<Processor>();
  
  public Map<String, StringBuilder> mergeFilesWithChunks(
        Map<String, String> paths,
        boolean checkLinesExcluded,
        String outputName,
        List<String> wraps,
        String defaultExtension)
        throws FileNotFoundException, IOException {
        
        if (defaultExtension == null) {
            defaultExtension = "";
        }
        
        Iterator<String> it = paths.keySet().iterator();
                
        Map<String, StringBuilder> allChunks =
            new HashMap<String, StringBuilder>();
        
        while (it.hasNext()) {
            String item = it.next();
            String dirBase = paths.get(item);

            dirBase = new File(this.getCwd(), dirBase).getAbsolutePath();
            logVeryVerbosive(">>> Dir Base + Path : " + dirBase + " --> " + item);
            LineReader in = null;
            String topDir = this.getTopAbsoluteParent(dirBase);
            String pathPrefix;

            if (item.startsWith(topDir)) {
                pathPrefix = "";
            } else {
                pathPrefix = dirBase;
            }
            //no Cwd here!
            File file = new File(pathPrefix + File.separator + item);

            if (file.getCanonicalFile().getAbsolutePath()
                .equals(outputName)) {
                log("!!! File is the current output (EXCLUDING): "
                    + file.getAbsolutePath());
            } else {
        //if (this.checkIfExists(file)) {
                //log(">>> File DOES exist: " + file.getAbsolutePath());
                try {
                    in = (new LineReader(file));
                    
                    String tmp;
                    List<String> lines = new ArrayList<String>();

                    while ((tmp = in.readLine()) != null) {
                        if (!checkLinesExcluded || !isLineIgnored(tmp)) {
                            lines.add(tmp);
                        }
                    }
                    
                    List<Object[]> chunks = 
                        MiniProcessorHelper.getFileInChunks(lines, wraps, defaultExtension);
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
                    
                    log(">>> Merging: " + file.getAbsolutePath());
                } catch (FileNotFoundException fnf) {
                    log(">>> File DOES NOT exist! Some of File files may"
                        + " point to dependencies that do not match -s and"
                        + " --file-deps-prefix  directory! Use -vv and see "
                        + "whats missing.\n    File failed to open: "
                        + file.getAbsolutePath());
                } finally {
                    if (in != null) {
                        in.close();
                    }
                }
//        } else {
//          log(">>> File DOES NOT exist! Some of File files may"
//                  + " point to dependencies that do not match -s and"
//                  + " --file-deps-prefix  directory! Use -vv and see "
//                  + "whats missing.\n    File failed to open: "
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
//            if (chunkRawName.equals("")) {
//                currentOutputName = outputName;
//            }
//            File f = new File(currentOutputName);
//            if (f.exists()){
//                f.delete();
//            }
//        }

        for (String chunkName : allChunks.keySet ()) {
                StringBuilder chunk = allChunks.get(chunkName);
            String chunkRawName = chunkToExtension(chunkName);
            String currentOutputName = outputName + "." + chunkRawName;
            if (chunkRawName.equals("")) {
                currentOutputName = outputName;
            }
            if (chunk != null && chunk.length() > 0) {
                BufferedWriter writer = null;
                try {
                    writer = new BufferedWriter(
                        new FileWriter(currentOutputName, !clear));
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
   * @param path
   * @param relative if true, paths to be returned are relative (as is in deps)
   * @return
   * @throws FileNotFoundException
   * @throws IOException
   */
  public LinkedHashMap<String, String>
          getFileDependenciesFromFile(
              String path,
              boolean relative,
              String output)
          throws FileNotFoundException, IOException {
    return getFilesListFromFile(path, relative, false, output);
  }

  /**
   * Function getting dependencies map by using file as input.
   * 
   * @param path path to root file + base
   * @param relative if true return relative "as is" paths values
   * @param ignoreDependencies if true, do not search for dependencies 
   * (it has sense to use if input path is a directory)
   * @param currentOutput
   * @return
   * @throws FileNotFoundException
   * @throws IOException
   */
  public LinkedHashMap<String, String> getFilesListFromFile(
          String path,
          boolean relative,
          boolean ignoreDependencies,
          String currentOutput)
          throws FileNotFoundException, IOException {
    // path to file and base
    LinkedHashMap<String, String> paths = new LinkedHashMap<String, String>();
    LinkedHashMap<String, String> excludes = new LinkedHashMap<String, String>();
    
    File startingFile = new File(getCwd(), path);
    
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
              .equals(currentOutput)) {
        // do not include current startingFile
        log("Excluded: " + files.get(i).getName());
        files.remove(i--);
      } else {
        //log("Excluded NOT: " + files.get(i).getName());
      }
    }
    
    boolean checkIfFileExists = !this.isAssumeFilesExist();
    
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
    
    //this is a hash ensuring that no file duplicates will occure in dependencies
    //@TODO check where it can be added
    alreadyProcessed =  new HashMap<String, Boolean>();
    helpingMap = new HashMap<String, String>();
    this.dependenciesChecked.clear();
    this.processed.clear();
    this.existingFiles.clear();
    
    for (File file : files) {
      //log( files.get(i).getAbsolutePath());
      String dependencyPath = file.getAbsolutePath();
      //already in
      if (this.dependenciesChecked.containsKey(dependencyPath)) {
        continue;
      }
      //dont process current path, if any dependencies chain contains it
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

    if (ignoreDependencies) {
      log(">>> Dependencies includes ignored !");
    }
    
    return paths;
  }
  private Map<String, String> dependenciesChecked =
          new HashMap<String, String>();
  
  private boolean cacheFilesForMerge = false;
  
  private HashMap<String,Boolean> processed = new HashMap<String, Boolean>();
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
    if (processed.containsKey(file.getAbsolutePath())) {
      return false;
    }
    processed.put(file.getAbsolutePath(), true);
    
    //from is recursion parameter! dont use.
    if (from == null) {
      this.setIndentLevel(0);
      logVeryVerbosive("Searching for dependencies in file " + file.getPath());
    }
    
    String line, dependencyPathString = null;
    LineReader in = null;
    boolean excludeThisFile = false;
    boolean mayBePreProcessorLine = false;
    String[] dependencyPath;

    if (!ignoreDependencies) try {

    in = new LineReader(file);
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
                  .containsKey(dependencyPath[0]
                  )) {

        ////@TODO    add extension check also to included dependencies - OR
        //// maybe leav it and dependencies should not be filtered:
//        this.testIfFileIncluded(files.get(i))

          logVeryVerbosive(this.getCurrentIndent() + dependencyPath[0]
              + " base: " + dependencyPath[1]
              + ",  (original text: " + dependencyPathString + ")");

          File tmp = new File(getCwd(), dependencyPath[0]);
          //do not analyse files already in paths
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
            log(this.getCurrentIndent()
              + ">>> !!! Dependency file could not be found, either file does "
              + "not exist or source base is incorrect! dependency line: "
              + line + " : " + dependencyPathString);
          }
        }

        this.dependenciesChecked.put(dependencyPathString, null);

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
    } catch (FileNotFoundException ex) {
      log(this.getCurrentIndent()
              + ">>> !!! File not found, either file does "
              + "not exist or source base is incorrect! PATH: "
              + file.getPath() + "\n Exception: \n");
      log(ex.getMessage());

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
  
  private HashMap<String, Boolean> alreadyProcessed = 
          new HashMap<String, Boolean>();
  
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
    File srcBase = new File(getCwd(), dirBase); //or "." ?
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
      log("EXCLUDED path : " + tmp);
    } else {
      boolean addToPaths = true;
      if (checkIfFilesExists) {
        if (!this.checkIfExists(file)) {
          addToPaths = false;
          log("By check if exist: File do not exist. "
                  + file.getAbsolutePath());
        }
      }
      
      if (addToPaths) {
        if (alreadyProcessed.containsKey(file.getAbsolutePath())) {
          return;
        } else {
          alreadyProcessed.put(file.getAbsolutePath(), true);
        }
        
        String path = null;
        
        if (relative) {
          path = file.getAbsolutePath().replace(prefix, "");
        } else {
          path = file.getAbsolutePath();
        }
        
        boolean added = false;
        
        if (!paths.containsKey(path)) {
          added = this.addPath(
            paths,
            tmp = path,
            excludes,
            dirBase);
        
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
                    : "Direct listing - not as a dependency."));

          }
        } else {
          logVeryVerbosive(this.getCurrentIndent()
                  + ">>> Already queued path (total:"
                  + paths.size()
                  + ", base: " + paths.get(path)
                  + " , relative:" + relative + ")   : "
                  + path + " [ src base related: " + prefix + "]"
                  //  +"     Absolute: " + file.getAbsolutePath()
                  + "     From: "
                  + ((from != null) ? from.getPath()
                  : "Direct listing - not as a dependency."));
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
    return line != null
            && (line.startsWith("//")
            || line.startsWith("/*")
            || line.startsWith("#")
            || line.startsWith("<!")
            || line.startsWith(";"));
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
