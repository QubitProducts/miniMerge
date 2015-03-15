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
package com.qubitproducts.compilejs;

import com.qubitproducts.compilejs.Log.LogLevel;
import static com.qubitproducts.compilejs.Log.setLevel;
import com.qubitproducts.compilejs.fs.LineReader;
import com.qubitproducts.compilejs.processors.JSWrapperProcessor;
import com.qubitproducts.compilejs.processors.JSTemplateProcessor;
import com.qubitproducts.compilejs.processors.JSStringProcessor;
import static com.qubitproducts.compilejs.MainProcessorHelper.chunkToExtension;
import com.qubitproducts.compilejs.processors.InjectionProcessor;
import java.io.BufferedWriter;
import java.io.File;
import java.io.FileWriter;
import java.io.IOException;
import java.io.PrintStream;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.logging.Logger;

/**
 *
 * @author Peter (Piotr) Fronc <peter.fronc@qubitproducts.com>
 */
public class CompileJS {

    public static String MORE_ARGS = "\nNeed more arguments.\n"
        + "\n"
        + "Example:\n"
        + "\n"
        + "java -jar compilejs.jar -o out.js --info -v -s js/app/Main.js  --source-base "
        + "js/  --index --prefix \">>> \" --suffix \" <<<\"  -i .js,.jss  "
        + "  -dl \"Log.FINE\"\n"
        + "\n"
        + "Translates to:\n"
        + "  -Output to out.js\n"
        + "  -Display info\n"
        + "  -Verbosive (use -vv for very verbosive)\n"
        + "  -source file (can be directory) at js/app/Main.js\n"
        + "  -Source base for dependencies searching at js/\n"
        + "  -List index only (remove --index to merge contents instead)\n"
        + "  -Prefix is '>>> ' (--index only)\n"
        + "  -Suffix is ' <<<' (--index only)\n"
        + "  -Include files with .js and .jss extension only (remove for all files)\n"
        + "  -Exclude from files lines containing 'Log.FINE' (only when merging contents)\n"
        + "\n"
        + "Please use --help or -h for more information.";

    public static String USAGE = "CompileJS \n"
        + "================================================================================\n"
        + "\n"
        + "Summary\n"
        + "\n"
        + "CompileJS is a tool supporting OO JavaScript. It has been created to\n"
        + "allow developers to include dependencies and CSS and HTML content in \n"
        + "JS files. CompileJs extends CompileJS functionality with per-extension\n"
        + "dependencies recognition (CSS, HTML). It also supports embeded string\n"
        + "templates for javascript, so HTML fragments can be in unchanged form.\n"
        + "CompileJS is lightweight and written purely in java.\n"
        + "Program is a great concatenating tool, especially when used for web development \n"
        + "build systems. It allows simply and efficiently merging JS or CSS dependencies \n"
        + "trees into single output files. Debug web pages can be easily created by using \n"
        + "CompileJS listing page options and release files can be optimized by using \n"
        + "powerful excluding patterns.\n"
        + "\n"
        + "================================================================================\n"
        + "\n"
        + "Details\n"
        + "\n"
        + "Program will merge or list files contents in specific order if dependencies\n"
        + "keywords are used, for example lines in a file named myFile.css:\n"
        + "\n"
        + "[...]\n"
        + "//:include css/style.css\n"
        + "[...]\n"
        + "//:include ../otherdir/license.txt\n"
        + "[...]\n"
        + "\n"
        + "will make program to order merged files contents as paths below: \n"
        + "\n"
        + "[srcBase]/css/style.css\n"
        + "[scrBase]/../otherdir/license.txt\n"
        + "[srcBase]myFile.css\n"
        + "\n"
        + "[srcBase] is runtime --src-base argument, by default, it is a current\n"
        + " directory value. Dependency detection works recursively.\n"
        + "Program supports basic sprockets style dependencies addressing for JS files, \n"
        + "//=require path will be translated to //:include path.js\n"
        + "\n"
        + "Program also can filter contents by:\n"
        + "\n"
        + "- line of text (keyword, for example: //delete )\n"
        + "\n"
        + "- block of text (/*~keyword*/,<--~keyword--> etc.). Using .~keyword. will \n"
        + "filter:\n"
        + "    AAA\n"
        + "    .keyword.\n"
        + "    BBB\n"
        + "    .~keyword.\n"
        + "    CCC\n"
        + "to:\n"
        + "    AAA\n"
        + "\n"
        + "\n"
        + "\n"
        + "    CCC\n"
        + "\n"
        + "- entire file (keyword, for example, file containing: /**exclude this file**/)\n"
        + "\n"
        + "Content filtering is applied to final merged output file only (after merging \n"
        + "files set).\n"
        + "\n"
        + "Program can simply list files instead of merging its contents by using --index \n"
        + "option - in addition, you can use prefix and suffix for each file path in the\n"
        + "list to be prefixed/suffixed. Files list is same ordered like in merge process.\n"
        + "\n"
        + "When using CompileJS it is strongly recommended to specify source base and the\n"
        + "file where process starts from. Please see usage list for more details.\n"
        + "\n"
        + "================================================================================\n"
        + "\n"
        + " Usage:                                                               \n"
        + "                                                                      \n"
        + "  -i <include extensions - file ENDINGS, default: * (all)>            \n"
        + "      example: -i .js,.css,.xml (default: .js)                        \n"
        + "  -o <output file path> This argument must be specified.              \n"
        + "  --info Show final config summary(info)                              \n"
        + "  -s <src dir/file path> if it is not directory, --source-base mode is\n"
        + "     enabled. If it is directory, minimerge will take as subject all  \n"
        + "     files from that directory and will treat it as a source base.    \n"
        + "  -ir ignore Require.js deps (default: false)                         \n"
        + "  --index It will ignore merging and generate prefix,suffix list      \n"
        + "  --prefix <prefix for index generation>                              \n"
        + "  --source-base comma separated source bases, if specified, all       \n"
        + "                dependencies will be searched with an order defined with\n"
        + "                this parameter.  Example: \"src, libs/src\"           \n"
        + "  --suffix <suffix for index generation>                              \n"
        + "  --not-relative <absolute paths index generation, default: false>    \n"
        + "  -vv very verbose                                                    \n"
        + "  -v verbose                                                          \n"
        + "  -nd <process no dependencies in files? see: //= and //:include>     \n"
        + "  -dl <cut lines containing strings(comma separated)>                    \n"
        + "   example: /*D*/ or /*X*/ (defaults: /*D*/,//=,//:include,//= require)\n"
        + "  -df <file exclude patterns, defaults:                               \n"
        + "   /****!ignore!****/,////!ignore!////,##!ignore!## (comma separated) \n"
        + "  -dw <wrapped text cut by strings(comma separated)                   \n"
        + "   example: /*start*/ <cut text> /*~start*/ in file, command line arg \n"
        + "   will be: -dw /*~start*/ (keep ~ unique, it's used to mark endings. \n"
        + " --parse-only-first-comment-dependencies for performance reasons      \n"
        + "   you may want to parse dependencies contents only for first lines   \n"
        + "   starting in a file as a comment (it means that minimerege will     \n"
        + "   not go through file contents to analyse deps and only till         \n"
        + "   comment like contents is present)                                  \n"
        + " --add-base If this option is added and --index is used the file list \n"
        + "   index will have source base appended accordigly to where it is found.\n"
        + " --exclude-file-patterns If this option is specified, each comma       \n"
        + "   separated string will be tested with java regex method to match \n"
        + "   name of file. If any of strings match - file will be     \n"
        + "   excluded from processing.\n"
        + " --keep-lines If passed, stripping process will put empty lines in \n"
        + "              place of cut out ones. Default: false.\n"
        + " --unix-path If index listings should care for UNIX style output, "
        + "         default is: true\n"
        + " --exclude-file-path-patterns If this option is specified, each comma \n"
        + "   separated string will be tested with java regex method to match \n"
        + "   name of full file path. If any of strings match - file will be     \n"
        + "   excluded from processing.\n"
        + " --no-eol If set, and --index option is selected, no end of line will be \n"
        + "          added to the index list items.\n"
        + " --cwd Specify current working directory. Default is current directory.\n"
        + "       It does not affect -o property. Use it when you cannot manage CWD.\n"
        + " --no-file-exist-check if added, MM will NOT check if dependencies EXIST. \n"
        + "                   It also assumes that first class path is used ONLY - "
        + "                   first entry from --source-base will be used ONLY."
        + "\n"
        + " --chunk-extensions array, comma separated custom extensions used for wraps.\n"
        + " --only-cp Pass to make compilejs use only classpath baesed imports.\n"
        + "   Default: /*~css*/,/*~html*/,/*~" + JSTemplateProcessor.JS_TEMPLATE_NAME
                    + "*/  Those wrap definitions are used to take out\n"
        + "   chunks of file outside to output with extension defined by wrap keyword.\n"
        + "   For example: /*~c-wrap*/ chunk will be written to default OUTPUT \n"
        + "   (-o option) plus c-wrap extension. Its advised to use alphanumeric\n"
        + " characters and dash and underscore and dot for custom wraps.\n"
        + " --options compilejs specific options: \n"
        + "          css2js -> convert css output to javascript. The javascript\n"
        + "                   producing CSS will be inserted before all JS code.\n"
        + "          css2js-multiline -> Display js from css in mulitlines.\n"
        + "          wrap-js -> If javascript files should be wrapped in functions.\n"
        + "          html-output -> all files should be merged into one html\n"
        + "                         output file.\n"
        + "\n"
        + " --help,-h Shows this text                                              \n"
        + "================================================================================";

    public static final Logger LOGGER
        = Logger.getLogger(CompileJS.class.getName());

    public static PrintStream ps = System.out;

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
    public static void printUsage() {
        ps.print(USAGE);
    }
    /**
     * Main function. See the usage blocks for args.
     *
     * @param args the command line arguments
     * @throws java.io.IOException
     */
    public static void main(String[] args) throws IOException, Exception {
      //add prop file reading
      try{
        new CompileJS().compile(args);
      } finally {
        LineReader.clearCache();
      }
    }
    
    
    
    public long compile(String[] args) throws IOException, Exception {

        boolean exit = false;
        long start = System.nanoTime();
        long done = 0;
        /*
         * Initialise the arguments to be stored.
         */
        String filesIncluded = ".js,.css,.html,.htm,.xhtml,.xml,.json";
        String out = null;
        Boolean noEol = false;
        boolean info = false;
        boolean help = false;
        boolean relative = true;
        boolean onlyClasspath = false;
        boolean ignoreRJS = false;
        String srcString = ".";
        ArrayList<String> pathsList = new ArrayList<String>();

        List<String> sourceBase = new ArrayList<String>();
        String linesToExclude = null;
        String filesToExclude = null;
        String wrapsToExclude = null;
        boolean generateIndex = false;
        boolean unixPath = true;
        boolean dependencies = true;
        boolean keepLines = false;
        boolean parseOnlyFirstComments = false;

        String defaultPrefix = "<script type=\"text/javascript\" src=\"";
        String defaultSuffix = "\"></script>";
        
        Map<String, String> prefixPerExtension = new HashMap<String, String>();
        Map<String, String> suffixPerExtension = new HashMap<String, String>();
        
        boolean withSourceBase = false;
        String excludeFilePatterns = null;
        String excludeFilePathPatterns = null;
        String cwd = null;
        boolean fsExistsOption = true;
        boolean perExtensions = true;
        
        List<String> defaltWraps = Arrays.asList(new String[]{
            "/*~css*/",
            "/*~html*/",
            "/*~" + JSTemplateProcessor.JS_TEMPLATE_NAME + "*/",
            "/*~" + JSStringProcessor.JS_TEMPLATE_NAME + "*/"
        });

        MainProcessor miniProcessor = null;
        HashMap<String, String> options = new HashMap<String, String>();
        String eol = "\n";
                
        try {
            for (int i = 0; i < args.length; i++) {
                if (args[i].equals("-i")) {
                    filesIncluded = args[i++ + 1];

                } else if (args[i].equals("--keep-lines")) {
                  keepLines = true;
                } else if (args[i].equals("-o")) {
                    out = args[i++ + 1];
                } else if (args[i].equals("-s")) {
                    srcString = args[i++ + 1];
                    String[] sourceFiles = srcString.split(",");
                    for (String tmp : sourceFiles) {
                      pathsList.add(tmp);
                    }
                } else if (args[i].equals("--parse-only-first-comment-dependencies")) {
                    parseOnlyFirstComments = true;
                } else if (args[i].equals("--source-base")) {
                    String[] srcs = args[i++ + 1].split(",");
                    for (String src1 : srcs) {
                        String path = src1.trim();
                        if (!path.equals("")) {
                            sourceBase.add(path);
                        }
                    }
                } else if (args[i].equals("-cp")) {
                  String cp = args[i++ + 1];
                  String path = cp.trim();
                  if (!path.equals("")) {
                      sourceBase.add(path);
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
                    defaultPrefix = args[i++ + 1];
                } else if (args[i].equals("--suffix")) {
                    defaultSuffix = args[i++ + 1];
                } else if (args[i].startsWith("--prefix-")) {
                    ps.println(args[i]);
                    prefixPerExtension.put(
                        args[i].replaceFirst("--prefix-", ""),
                        args[i + 1]);
                } else if (args[i].startsWith("--suffix-")) {
                    suffixPerExtension.put(
                        args[i].replaceFirst("--suffix-", ""),
                        args[i + 1] + eol);
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
                } else if (args[i].equals("--exclude-file-patterns")) {
                    excludeFilePatterns = args[i++ + 1];
                } else if (args[i].equals("--cwd")) {
                    cwd = args[i++ + 1];
                } else if (args[i].equals("--exclude-file-path-patterns")) {
                    excludeFilePathPatterns = args[i++ + 1];
                } else if (args[i].equals("--no-eol")) {
                    noEol = true;
                    if (noEol) { //move it around...
                        eol = "";
                    }
                } else if (args[i].equals("--unix-path")) {
                    unixPath = true;
                } else if (args[i].equals("--no-file-exist-check")) {
                    fsExistsOption = false;
                } else if (args[i].equals("--options")) {
                    String[] opts = args[i++ + 1].split(",");
                    for (String opt : opts) {
                        options.put(opt, "true");
                    }
                } else if (args[i].equals("-mm-mode")) {
                    perExtensions = false;
                } else if (args[i].equals("--chunk-extensions")) {
                    defaltWraps = Arrays.asList(args[i++ + 1].split(","));
                } else if (args[i].equals("--no-chunks")) {
                    defaltWraps = null;
                } else if (args[i].equals("--only-cp")) {
                  onlyClasspath = true;
                }
//                else if (args[i].equals("--html-output")) {
//                    options.put("html-output", "true");
//                }
            }
        } catch (NullPointerException ex) {
            exit = true;
        } catch (IndexOutOfBoundsException ex) {
            exit = true;
        }

        //put defaults
        prefixPerExtension.put("", defaultPrefix);
        suffixPerExtension.put("", defaultSuffix + eol);
        
        if (!prefixPerExtension.containsKey("css")) {  
            prefixPerExtension.put("css", "<link rel=\"stylesheet\" href=\"");
        }
        if (!prefixPerExtension.containsKey("js")) {
            prefixPerExtension.put("js", defaultPrefix);
        }
        
        if (!suffixPerExtension.containsKey("css")) {
            suffixPerExtension.put("css", ">\n");
        }
        
        if (!suffixPerExtension.containsKey("js")) {
            suffixPerExtension.put("js", defaultSuffix + "\n"); //clean up defaults
        }
        
        if (cwd != null) {
          cwd = new File(cwd).getCanonicalPath();
        }
        
        //validate and refresh out
        if (cwd != null && out != null) {
          if (out.startsWith(cwd)) {
            out = out.substring(cwd.length());
            while (out.startsWith(File.separator)) {
              out = out.substring(1);
            }
          }
        }
        
        boolean dotAdded = false; 
        //sources preparation
        List<String> cleanedPaths = new ArrayList<String>();
        for (String src : pathsList) {
          if (src.equals("")) {
            continue;
          }

          if (cwd != null) {
            if (src.startsWith(cwd)) {
              src = src.substring(cwd.length());
              while (src.startsWith(File.separator)) {
                src = src.substring(1);
              }
            }
          }

          File srcFile = new File(cwd, src);

          if (!srcFile.exists()) {
            throw new Exception("File: "
                + srcFile.getAbsolutePath()
                + "Does not exist. \nPlease check your configutration.");
          }

          if (sourceBase.isEmpty()) {
            if (srcFile.isFile()) {
              if (!dotAdded) sourceBase.add(".");
              dotAdded = true;
            } else {
              sourceBase.add(src);
            }
          }
          cleanedPaths.add(src);
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
            String tmpPaths = "\n";
            for (String tmp : cleanedPaths) {
                tmpPaths += "\t" + new File(cwd, tmp).getPath() + "\n";
            }
          
            ps.println(
                " miniMERGE config selected:");
            ps.println("  -i  Included file types: " + filesIncluded
                + "\n  -o  Output: "
                + (out == null ? "null" : 
                    (new File(cwd, out)).getAbsolutePath() + ".EXT")
                + "\n  -s  Src dir: " + tmpPaths
                + "\n  -ir Ignoring RequireJS: " + (ignoreRJS ? "yes" : "no")
                + "\n  -nd No dependencies: " + (!dependencies)
                + "\n  -v  Verbosive: " + (verbose ? "yes" : "no")
                + "\n  -vv Very verbosive: " + (vverbose ? "yes" : "no")
                + "\n  -dl Excluding lines containing: " + linesToExclude
                + "\n  -dw Exclude blocks wrapped by: " + wrapsToExclude
                + "\n  -df Exclude files with keywords: " + filesToExclude
                + "\n  --parse-only-first-comment-dependencies: " + parseOnlyFirstComments
                + "\n  --source-base " + sourceBase
                + "\n  --keep-lines " + keepLines
                + "\n  --index: "
                + (generateIndex
                    ? " yes (Generate paths index only (no files merging).)"
                    : " no (Merge files.)")
                + "\n  --prefix (Index paths prefix): " + defaultPrefix
                + "\n  --suffix (Index paths suffix): " + defaultSuffix
                + "\n  --not-relative: " + (!relative ? "yes, paths will be absolute"
                    : "no, paths will be as defined in source base.")
                + "\n  --add-base: " + withSourceBase
                + "\n  --unix-path: " + unixPath
                + "\n  --cwd: " + (cwd == null ? "." : cwd)
                + "\n  --no-file-exist-check: " + !fsExistsOption
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
            done = (System.nanoTime() - start);
            return done;
        }

        if (out != null) {
            try {
                out = new File(cwd, out).getAbsolutePath();
                miniProcessor = new MainProcessor();
                miniProcessor.onlyClassPath(onlyClasspath);
                miniProcessor.setKeepLines(keepLines);
                miniProcessor.setAssumeFilesExist(!fsExistsOption);
                miniProcessor.setSourceBase(sourceBase.toArray(new String[0]));
                miniProcessor.setMergeOnly(filesIncluded.split(","));
                if (excludeFilePatterns != null) {
                    miniProcessor
                        .setFileExcludePatterns(excludeFilePatterns.split(","));
                }
                if (excludeFilePathPatterns != null) {
                    miniProcessor
                        .setFilePathExcludePatterns(excludeFilePathPatterns.split(","));
                }
                miniProcessor.setCwd(cwd);
                miniProcessor.setIgnoreRequire(ignoreRJS);
                miniProcessor.setIgnores(linesToExclude.split(","));
                miniProcessor.setFileIgnores(filesToExclude.split(","));
                miniProcessor.setFromToIgnore(wrapsToExclude.split(","));

                if (!verbose) {
                    setLevel(LogLevel.NONE);
                }

                if (vverbose) {
                    miniProcessor.setVeryVerbosive(true);
                }

                if (parseOnlyFirstComments) {
                    miniProcessor.setCheckEveryLine(false);
                }

                Map<String, String> paths = miniProcessor
                    .getFilesListFromFile(
                        cleanedPaths,
                        relative,
                        !dependencies,
                        out);

                log("Writing results...\n");

                if (generateIndex) {
                    String result = MainProcessorHelper
                        .getPrefixScriptPathSuffixString(
                            paths,
                            prefixPerExtension,
                            suffixPerExtension,
                            withSourceBase,
                            unixPath
                            );

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
                    if (perExtensions) {
                        
                        String preTemplate = "    \"";//var template = [\n    \"",
                        String sufTemplate = "\"\n";//\\n\"\n].join('');\n",
                        String separator = "\\n\",\n    \"";//var template = [\n    \"",
                        
                        miniProcessor.addProcessor(new JSTemplateProcessor(
                            preTemplate,
                            sufTemplate,
                            separator
                        ));
                        
                        miniProcessor.addProcessor(new JSStringProcessor(
                            "\"",
                            "\"\n",
                            "\\n"
                        ));
                        
                        if (options.containsKey("wrap-js")) {
                            miniProcessor.addProcessor(new JSWrapperProcessor());
                        }
                        
                        if (options.containsKey("injections") ||
                            options.containsKey("line-injections")) {
                            InjectionProcessor p = new InjectionProcessor(
                                miniProcessor
                            );
                            if (options.containsKey("line-injections")) {
                                p.setReplacingLine(true);
                            }
                            miniProcessor.addProcessor(p);
                        }
                        
                        processPerExtensions(
                            paths,
                            miniProcessor,
                            out,
                            options,
                            defaltWraps);
                    } else {
                        miniProcessor.stripAndMergeFilesToFile(paths, true, out);
                    }
                }
                if (info) {
                    ps.println("Merging/Index finished.\n\n");
                    ps.println("Heap: " + Runtime.getRuntime().totalMemory() / 1024 / 1024
                        + "MB\n");
                }
//            } catch (FileNotFoundException ex) {
//                Logger.getLogger(CompileJS.class.getName()).log(Level.SEVERE, null, ex);
//            } catch (IOException ex) {
//                Logger.getLogger(CompileJS.class.getName()).log(Level.SEVERE, null, ex);
            } finally {
                LineReader.clearCache();
                if (miniProcessor != null) {
                  miniProcessor.clearCache();
                }
                
                done = System.nanoTime() - start;
        
                if (info) {
                    ps.println("Done in: "
                                + ((float) done / 1000000000.0 )
                                + "s");
                }
            }
        }
        
        
        
        return done;
    }
    
    private static void processPerExtensions(
        Map<String, String> paths,
        MainProcessor miniProcessor,
        String out,
        Map<String, String> options,
        List<String> wraps)
        throws IOException {
        Map<String, String> other
            = new LinkedHashMap<String, String>();
        Map<String, Map<String, String>> extensionToNameMap
            = new LinkedHashMap<String, Map<String, String>>();
        
        for (String path : paths.keySet()) {
            try {
                String ext = path.substring(path.lastIndexOf(".") + 1);
                if (!"".equals(ext)) {
                    //init
                    if (!extensionToNameMap.containsKey(ext)) {
                        extensionToNameMap.put(ext, new LinkedHashMap<String, String>());
                    }
                    // collect ext => path:src-base
                    extensionToNameMap.get(ext).put(path, paths.get(path));
                } else {
                    //default collection
                    other.put(path, paths.get(path));
                }
            } catch (IndexOutOfBoundsException e) {
                other.put(path, paths.get(path));
            }
        }
        
        Map<String, StringBuilder> allchunks = new HashMap<String, StringBuilder>();
        
        boolean noWraps = (wraps == null);
        
        for (String ext : extensionToNameMap.keySet()) {
            Map<String, String> filePaths = extensionToNameMap.get(ext);
            String currentOut = out + "." + ext;
            if (noWraps) {
                BufferedWriter writer = new BufferedWriter(new FileWriter(
                    currentOut, true
                ));
                miniProcessor.mergeFiles(filePaths, true, writer, currentOut);
                writer.flush();
                writer.close();
            } else {
                //chunks returned are mapped by extensions, not output, so example:
                // "": "defulaut output"
                // "html": ".className {sdfgdasf} "
                // "html": "<div/>"
                Map<String, StringBuilder> chunks = 
                    miniProcessor.mergeFilesWithChunksAndStripFromWraps(
                        filePaths,
                        true,
                        currentOut,
                        wraps,
                        ext);
                mergeChunks(allchunks, chunks);
            }
        }
        
        if (options.containsKey("html2js")) {
          String[] types = new String[]{"html", "html","xhtml"};
          for (String type : types) {
            StringBuilder html = allchunks.get(type);
            if (html != null) {
              StringBuilder[] newJS = null;
              if (!options.containsKey("html2js-multiline")) {
                //returns two chunks to inject passed callback
                newJS = turnHTMLToJS(html.toString().replace("\n", ""));
              } else {
                newJS = turnHTMLToJS(html.toString());
              }
              allchunks.remove(type);
              StringBuilder js = allchunks.get("js");
              if (js != null) {
                allchunks.put("js", newJS[0]
                        .append("function(){\n")
                        .append(js)
                        .append("\n}")
                        .append(newJS[1]));
              } else {
                allchunks.put("js", newJS[0].append(newJS[1]));
              }
            }
          }
        }
        
        if (options.containsKey("css2js")) {
            StringBuilder css = allchunks.get("css");
            if (css != null) {
              StringBuilder[] newJS = null;
                if (!options.containsKey("css2js-multiline")) {
                    //returns two chunks to inject passed callback
                    newJS = turnCSSToJS(css.toString().replace("\n", ""));
                } else {
                    newJS = turnCSSToJS(css.toString());
                }
                allchunks.remove("css");
                StringBuilder js = allchunks.get("js");
                if (js != null) {
                    allchunks.put("js", newJS[0]
                        .append("function(){\n")
                        .append(js)
                        .append("\n}")
                        .append(newJS[1]));
                } else {
                    allchunks.put("js", newJS[0].append(newJS[1]));
                }
            }
        }
        
        if (!noWraps) {
            if (options.containsKey("html-output")) {
                StringBuilder js = allchunks.get("js");
                StringBuilder css = allchunks.get("css");
                StringBuilder html = allchunks.get("html");
                StringBuilder index = new StringBuilder();
//                index.append("<!DOCTYPE html PUBLIC \"-//W3C//DTD XHTML 1.0 Transitional//EN\"\n");
//                index.append("\"http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd\">\n");
//                index.append("<html xmlns=\"http://www.w3.org/1999/xhtml\">\n");
                index.append("<html>\n");
                index.append("<head>\n");
                index.append("<meta http-equiv=\"Content-Type\" content=\"text/html;charset=utf-8\" />");
                index.append("<style>\n");
                index.append(css == null ? "" : css);
                index.append("\n</style>\n");
                index.append("</head>\n");
                index.append("<body>\n");
                index.append("<div class='templates'>\n");
                index.append(html == null ? "" : html);
                index.append("\n</div>\n");
                index.append("<script type=\"text/javascript\">\n//<![CDATA[\n");
                index.append(js == null ? "" : js);
                index.append("\n//]]>\n</script>\n");
                index.append("</body>\n");
                index.append("</html>");
                File output = new File(out + ".html");//xhtml
                BufferedWriter writer = new BufferedWriter(new FileWriter(output));
                writer.append(index);
                writer.close();
            } else {
                if (allchunks.isEmpty()) {
                    log("\n\n>>> No content to write. <<<\n\n\n");
                } else {
                    miniProcessor.writeOutputs(allchunks, out, true);
                }
            }
        }
    }
    
    static String tpl1 =
          "(function (callback) {\n"
        + "    var check = function () {\n"
        + "        var head = document.getElementsByTagName('head')[0];\n"
        + "        if (head) {\n"
        + "            var css = [\n";

    static String tpl2 = 
          "            ].join(\"\");\n"
        + "            var styleElement;\n"
        + "            styleElement = document.createElement('style');\n"
        + "            styleElement.setAttribute('type', 'text/css');\n"
        + "            if (styleElement.styleSheet) {\n"
        + "                styleElement.styleSheet.cssText = css;\n"
        + "            } else {\n"
        + "                styleElement.appendChild(document.createTextNode(css));\n"
        + "            }\n"
        + "            head.appendChild(styleElement);\n"
        + "            if (callback) {callback();}"
        + "        } else {\n"
        + "            setTimeout(check, 15);\n"
        + "        }\n"
        + "    };\n"
        + "    check();\n"
        + "}(";

    static String tpl3 = "));";
    
    static StringBuilder[] turnCSSToJS(String css) {
        String[] lines = css.split("\n");
        StringBuilder builder = new StringBuilder(tpl1);
        int i = 0;
        int size = lines.length;
        for (String line : lines) {
            line = line.replace("\\", "\\\\");
            line = line.replace("\"", "\\\"");
            builder.append("\t\"");
            builder.append(line);
            builder.append("\\n\"");
            i++;
            if (i < size) {
                builder.append(",\n");
            } else {
                builder.append("\n");
            }
        }
        builder.append(tpl2);
        return new StringBuilder[]{builder, new StringBuilder(tpl3)};
    }
    
    static String htpl1 =
          "(function (callback) {\n"
        + "    var check = function () {\n"
        + "        var body = document.getElementsByTagName('body')[0];\n"
        + "        if (body) {\n"
        + "            var html = [\n";

    static String htpl2 = 
          "            ].join(\"\");\n"
        + "            var div;\n"
        + "            div = document.createElement('div');\n"
        + "            div.setAttribute('class', 'html-to-js');\n"
        + "            div.innerHTML = html;\n"
        + "            body.appendChild(div);\n"
        + "            if (callback) {callback();}"
        + "        } else {\n"
        + "            setTimeout(check, 15);\n"
        + "        }\n"
        + "    };\n"
        + "    check();\n"
        + "}(";

    static String htpl3 = "));";
    
    static StringBuilder[] turnHTMLToJS(String html) {
        String[] lines = html.split("\n");
        StringBuilder builder = new StringBuilder(htpl1);
        int i = 0;
        int size = lines.length;
        for (String line : lines) {
            line = line.replace("\\", "\\\\");
            line = line.replace("\"", "\\\"");
            builder.append("\t\"");
            builder.append(line);
            builder.append("\\n\"");
            i++;
            if (i < size) {
                builder.append(",\n");
            } else {
                builder.append("\n");
            }
        }
        builder.append(htpl2);
        return new StringBuilder[]{builder, new StringBuilder(htpl3)};
    }
    
    static void mergeChunks (Map<String, StringBuilder> to,
        Map<String, StringBuilder> from) {
        for (String key : from.keySet()) {
            StringBuilder fromS = from.get(key);
            if (fromS != null) {
                key = chunkToExtension(key);
                StringBuilder toS = to.get(key);
                if (toS == null) {
                    toS = new StringBuilder("");
                    to.put(key, toS);
                }
                toS.append(fromS);
            }
        }
    }
}
