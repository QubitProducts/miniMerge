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

import java.io.BufferedWriter;
import java.io.File;
import java.io.FileNotFoundException;
import java.io.FileWriter;
import java.io.IOException;
import java.io.PrintStream;
import java.util.logging.Level;
import java.util.logging.Logger;
import com.qubitproducts.minimerge.MiniProcessor.LogLevel;
import java.util.ArrayList;
import java.util.Map;

/**
 *
 * @author Peter (Piotr) Fronc <peter.fronc@qubitproducts.com>
 */
public class Main {
  
  public static String MORE_ARGS = "\nNeed more arguments.\n" +
"\n" +
"Example:\n" +
"\n" +
"java -jar MiniMerge.jar -o out.js --info -v -s js/app/Main.js  --source-base "
          + "js/  --index --prefix \">>> \" --suffix \" <<<\"  -i .js,.jss  "
          + "  -dl \"Log.FINE\"\n" +
"\n" +
"Translates to:\n" +
"  -Output to out.js\n" +
"  -Display info\n" +
"  -Verbosive (use -vv for very verbosive)\n" +
"  -source file (can be directory) at js/app/Main.js\n" +
"  -Source base for dependencies searching at js/\n" +
"  -List index only (remove --index to merge contents instead)\n" +
"  -Prefix is '>>> ' (--index only)\n" +
"  -Suffix is ' <<<' (--index only)\n" +
"  -Include files with .js and .jss extension only (remove for all files)\n" +
"  -Exclude from files lines containing 'Log.FINE' (only when merging contents)\n" +
"\n" +
"Please use --help or -h for more information.";
  
  public static String USAGE = "MiniMerge \n" +
"================================================================================\n" +
"\n" +
"Summary\n" +
"\n" +
"MiniMerge allows easy files merging with its dependencies in a defined order.\n" +
"It is lightweight and written purely in java.\n" +
"Program is a great concatenating tool, especially when used for web development \n" +
"build systems. It allows simply and efficiently merging JS or CSS dependencies \n" +
"trees into single output files. Debug web pages can be easily created by using \n" +
"MiniMerge listing page options and release files can be optimized by using \n" +
"powerful excluding patterns.\n" +
"\n" +
"================================================================================\n" +
"\n" +
"Details\n" +
"\n" +
"Program will merge or list files contents in specific order if dependencies\n" +
"keywords are used, for example lines in a file named myFile.css:\n" +
"\n" +
"[...]\n" +
"//:include css/style.css\n" +
"[...]\n" +
"//:include ../otherdir/license.txt\n" +
"[...]\n" +
"\n" +
"will make program to order merged files contents as paths below: \n" +
"\n" +
"[srcBase]/css/style.css\n" +
"[scrBase]/../otherdir/license.txt\n" +
"[srcBase]myFile.css\n" +
"\n" +
"[srcBase] is runtime --src-base argument, by default, it is a current\n" +
" directory value. Dependency detection works recursively.\n" +
"Program supports basic sprockets style dependencies addressing for JS files, \n" +
"//=require path will be translated to //:include path.js\n" +
"\n" +
"Program also can filter contents by:\n" +
"\n" +
"- line of text (keyword, for example: //delete )\n" +
"\n" +
"- block of text (/*~keyword*/,<--~keyword--> etc.). Using .~keyword. will \n" +
"filter:\n" +
"    AAA\n" +
"    .keyword.\n" +
"    BBB\n" +
"    .~keyword.\n" +
"    CCC\n" +
"to:\n" +
"    AAA\n" +
"\n" +
"\n" +
"\n" +
"    CCC\n" +
"\n" +
"- entire file (keyword, for example, file containing: /**exclude this file**/)\n" +
"\n" +
"Content filtering is applied to final merged output file only (after merging \n" +
"files set).\n" +
"\n" +
"Program can simply list files instead of merging its contents by using --index \n" +
"option - in addition, you can use prefix and suffix for each file path in the\n" +
"list to be prefixed/suffixed. Files list is same ordered like in merge process.\n" +
"\n" +
"When using MiniMerge it is strongly recommended to specify source base and the\n" +
"file where process starts from. Please see usage list for more details.\n" +
"\n" +
"================================================================================\n" +
"\n" +
" Usage:                                                               \n" +
"                                                                      \n" +
"  -i <include extensions - file ENDINGS, default: * (all)>            \n" +
"      example: -i .js,.css,.xml (default: .js)                        \n" +
"  -o <output file path> This argument must be specified.              \n" +
"  --info Show final config summary(info)                              \n" +
"  -s <src dir/file path> if it is not directory, --source-base mode is\n" +
"     enabled. If it is directory, minimerge will take as subject all  \n" +
"     files from that directory and will treat it as a source base.    \n" +
"  -ir ignore Require.js deps (default: false)                         \n" +
"  --index It will ignore merging and generate prefix,suffix list      \n" +
"  --prefix <prefix for index generation>                              \n" +
"  --suffix <suffix for index generation>                              \n" +
"  --not-relative <absolute paths index generation, default: false>    \n" +
"  -vv very verbose                                                    \n" +
"  -v verbose                                                          \n" +
"  -nd <process no dependencies in files? see: //= and //:include>     \n" +
"  -dl <cut line contains strings(comma separated)>                    \n" +
"   example: /*D*/ or /*X*/ (defaults: /*D*/,//=,//:include,//= require)\n" +
"  -df <file exclude patterns, defaults:                               \n" +
"   /****!ignore!****/,////!ignore!////,##!ignore!## (comma separated) \n" +
"  -dw <wrapped text cut by strings(comma separated)                   \n" +
"   example: /*start*/ <cut text> /*~start*/ in file, command line arg \n" +
"   will be: -dw /*~start*/ (keep ~ unique, it's used to mark endings. \n" +
" --parse-only-first-comment-dependencies for performance reasons      \n" +
"   you may want to parse dependencies contents only for first lines   \n" +
"   starting in a file as a comment (it means that minimerege will     \n" +
"   not go through file contents to analyse deps and only till         \n" +
"   comment like contents is present)                                  \n" +
" --add-base If this option is added and --index is used the file list \n" +
"   index will have source base appended accordigly to where it is found.\n" +
" --help,-h Shows this text                            \n" +
"\n" +
"" +
"================================================================================";
  
  
  public static final Logger LOGGER =
          Logger.getLogger(Main.class.getName());
  
  public static PrintStream ps =  System.out;
  
  private static boolean verbose = false;
  private static boolean vverbose = false;
  
  private static void log(String msg) {
     if (verbose || vverbose) {
       ps.print(msg);
     }
  }
  
  public static void printArgs() {
    ps.println(MORE_ARGS);
  }
  
//  static {
//    try {
//      String propertiesPath = "minimerge.properties";
//      Properties properties = new Properties();
//      properties.load(
//              Main.class.getClassLoader()
//              .getResourceAsStream(propertiesPath));
//    } catch (IOException ex) {
//      Logger.getLogger(Main.class.getName()).log(Level.SEVERE, null, ex);
//    }
//  }
//  
  public static void printUsage () {
    ps.print(USAGE);
  }
  
  /**
   * Main function. See the usage blocks for args.
   * @param args the command line arguments
   */
  public static void main(String[] args) throws IOException {
    
    boolean exit = false;
    long start = System.nanoTime();
    /*
     * Initialise the arguments to be stored.
     */
    String filesIncluded = null;
    String out = null;
    boolean info = false;
    boolean help = false;
    boolean relative = true;
    boolean ignoreRJS = false;
    String src = null;
    ArrayList<String> sourceBase = new ArrayList<String>();
    String linesToExclude = null;
    String filesToExclude = null;
    String wrapsToExclude = null;
    boolean generateIndex = false;
    boolean dependencies = true;
    boolean parseOnlyFirstComments = false;
    String prefix = "<script type=\"text/javascript\" src=\"";
    String suffix = "\"></script>";
    boolean withSourceBase = false;
    
    MiniProcessor miniProcessor;
    
    try {
      for (int i = 0; i < args.length; i++) {
        if (args[i].equals("-i") ) {
          filesIncluded = args[i++ + 1];
          
        } else if (args[i].equals("-o")) {
          out = args[i++ + 1];
        } else if (args[i].equals("-s")) {
          src = args[i++ + 1];
        } else if (args[i].equals("--parse-only-first-comment-dependencies")) {
          parseOnlyFirstComments = true;
        } else if (args[i].equals("--source-base")) {
          String[] srcs = args[i++ + 1].split(",");
          for (int j = 0; j < srcs.length; j++) {
            String path = srcs[j].trim();
            if (!path.equals("")) {
              sourceBase.add(path);
            }
          }
        } else if (args[i].equals("--info")) {
          info = true;
        } else if (args[i].equals("-nd")) {
          dependencies = false;
        } else if (args[i].equals("-ir")) {
          ignoreRJS = true;
        } else if (args[i].equals("-dl")) {
          linesToExclude = args[i++ + 1];
        } else if (args[i].equals("-df")) {
          filesToExclude = args[i++ + 1];
        } else if (args[i].equals("-dw")) {
          wrapsToExclude = args[i++ + 1];
        } else if (args[i].equals("--index")) {
          generateIndex = true;
        } else if (args[i].equals("--prefix")) {
          prefix = args[i++ + 1];
        } else if (args[i].equals("--suffix")) {
          suffix = args[i++ + 1];
        } else if (args[i].equals("--not-relative")) {
          relative = false;
        } else if (args[i].equals("-vv")) {
          vverbose = true;
          verbose = true;
        } else if (args[i].equals("-v")) {
          verbose = true;
        } else if (args[i].equals("-h") || args[i].equals("--help")) {
          exit = true;
          info = true;
          help = true;
        } else if (args[i].equals("--add-base")) {
          withSourceBase = true;
        }
      }
    } catch (NullPointerException ex) {
      exit = true;
    } catch (IndexOutOfBoundsException ex) {
      exit = true;
    }

    if (src == null) {
      src = ".";
    }
    
    File srcFile = new File(src);
    src = (srcFile).getAbsolutePath();
    
    //get relative from current and set source base
    if (sourceBase.isEmpty()) {
      if (srcFile.isFile()) {
        String srceBase = srcFile.getCanonicalFile().getParent();
        srceBase = srceBase.replace(new File(".").getCanonicalPath(), ".");
        sourceBase.add(srceBase);
      } else {
        sourceBase.add(srcFile.getPath());
      }
    }
    
    if (filesIncluded == null) {
      filesIncluded = "*";
    }
    
    if (linesToExclude == null) {
      linesToExclude = "/*D*/,//=,//:include";
    }
    
    if (filesToExclude == null) {
      filesToExclude = "////!ignore!////,/****!ignore!****/,##!ignore!##";
    }
    
    if (wrapsToExclude == null) {
      wrapsToExclude = "/*~debug*/,/*~*/";
    }

    if (info) {
      ps.println(
            " CONFIG SELECTED:");
      ps.println(
            " -i  Included file types: " + filesIncluded
        + "\n -o  Output: " + 
              (out == null ? "null" : (new File(out)).getAbsolutePath())
        + "\n -s  Src dir: " + src
        + "\n -ir Ignoring RequireJS: " + (ignoreRJS ? "yes" : "no")
        + "\n -nd No dependencies: " + (!dependencies)
        + "\n -v  Verbosive: " + (verbose ? "yes" : "no")
        + "\n -vv Very verbosive: " + (vverbose ? "yes" : "no")
        + "\n -dl Excluding lines containing: " + linesToExclude
        + "\n -dw Exclude blocks wrapped by: " + wrapsToExclude
        + "\n -df Exclude files with keywords: " + filesToExclude
        + "\n --parse-only-first-comment-dependencies: " + parseOnlyFirstComments
        + "\n --source-base " + sourceBase
        + "\n --index: "
        + (generateIndex ? 
                " yes (Generate paths index only (no files merging).)"
              : " no (Merge files.)")
        + "\n --prefix (Index paths prefix): " + prefix
        + "\n --suffix (Index paths suffix): " + suffix
        + "\n --not-relative: " + (relative ? "yes, paths will be absolute"
              : "no, paths will be as defined in source base.")
        + "\n --add-base: " + withSourceBase 
      + "\n\n");
    }
    
    if (help) {
      printUsage();
    }
    
    if (out == null) {
      ps.println();
      ps.println(
              "***************************************************************");
      ps.println("* You must specify output (-o [file name]) path!\n"
               + "* Use --help or -h for more details.");
      ps.println("* Exiting.");
      ps.println(
              "***************************************************************");
      exit = true;
    }
    
    if (exit) {
      printArgs();
      return;
    }
    
    if (out != null) {
      try {
        
        miniProcessor = new MiniProcessor(out);
        miniProcessor.setSourceBase(sourceBase.toArray(new String[0]));
        miniProcessor.setMergeOnly(filesIncluded.split(","));
        miniProcessor.setIgnoreRequire(ignoreRJS);
        miniProcessor.setIgnores(linesToExclude.split(","));
        miniProcessor.setFileIgnores(filesToExclude.split(","));
        miniProcessor.setFromToIgnore(wrapsToExclude.split(","));

        if (!verbose) {
          MiniProcessor.LOG_LEVEL = LogLevel.NONE;
        }

        if (vverbose) {
          miniProcessor.setVeryVerbosive(true);
        }

        if (parseOnlyFirstComments) {
          miniProcessor.setCheckEveryLine(false);
        }

        Map<String, String> paths = miniProcessor
                .getFilesListFromFile(src, relative, !dependencies);

          log("Writing results...\n");

        if (generateIndex) {
          String result = MiniProcessorHelper
                  .getPrefixScriptPathSuffixString(
                        paths,
                        prefix,
                        suffix + "\n",
                        withSourceBase)
                  .toString();

          BufferedWriter writer = null;

          try {
            writer = new BufferedWriter(new FileWriter(new File(out)));

            log(result);

            writer.append(result);
            writer.flush();
          } finally {
            if (writer != null) {
              writer.close();
            }
          }
        } else {
          miniProcessor.mergeFilesToFile(paths, true, out);
        }
        if (info) {
          ps.println("Done in: "
                  + ((float)(System.nanoTime() - start))/1000000000.0
                  + "s" );
          ps.println("Merging/Index finished.\n\n");
          ps.println("Heap: " + Runtime.getRuntime().totalMemory()/1024/1024
                  + "MB\n");
        }
      } catch (FileNotFoundException ex) {
        Logger.getLogger(Main.class.getName()).log(Level.SEVERE, null, ex);
      } catch (IOException ex) {
        Logger.getLogger(Main.class.getName()).log(Level.SEVERE, null, ex);
      }
    }
  }
}
