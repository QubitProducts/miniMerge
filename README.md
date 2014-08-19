MiniMerge - "Merge files with dependencies."
================================================================================

Summary

MiniMerge allows easy files merging with its dependencies in a defined order.
It is lightweight and written purely in java.
Program is a great concatenating tool, especially when used for web development 
build systems. It allows simply and efficiently merging JS or CSS dependencies 
trees into single output files. Debug web pages can be easily created by using 
MiniMerge listing page options and release files can be optimized by using 
powerful excluding patterns.

================================================================================

Details

Program will merge or list files contents in specific order if dependencies
keywords are used, for example lines in a file named myFile.css:

     
     //:include css/style.css
     //:include ../otherdir/license.txt

will make program to order merged files contents as paths below: 

    [srcBase]/css/style.css
    [scrBase]/../otherdir/license.txt
    [srcBase]myFile.css

[srcBase] is runtime --src-base argument, by default, it is a current
 directory value. Dependency detection works recursively.
Program supports basic sprockets style dependencies addressing for JS files dependencies, 

     //=require path

will be translated to:

     //:include path.js

(Notice how its translated! Only direct paths are supported).

Program also can filter contents by:

- excluding line of text (keyword, for example: //delete )

- excluding block of text (by keyword, like: -dw /*~keyword*/ etc.). For example, using .~keyword. will 
filter following text:


          AAA
          //any foo                            .keyword.
          BBB
          .~keyword.   /// or bar
          CCC
    
to following (notice 3 mniddle lines excluded):

    AAA


    CCC

- excluding entire file (keyword, for example: -df /**exclude this file**/ will cause any file to be excluded if contains  /**exclude this file**/ anywhere in its contents) 

Content filtering is applied to final merged output file only (after merging 
files set).

Program can simply list files instead of merging its contents by using --index 
option - in addition, you can use prefix and suffix for each file path in the
list to be prefixed/suffixed. Files list is same ordered like in merge process.

When using MiniMerge it is strongly recommended to specify source base and the
file where process starts from. Please see usage list for more details - miniMerge supports MULTIPLE source bases!

================================================================================

     
         Usage:                                                               
                                                                              
          -i <include extensions - file ENDINGS, default: * (all)>            
              example: -i .js,.css,.xml (default: .js)                        
          -o <output file path> This argument must be specified.              
          --info Show final config summary(info)                              
          -s <src dir/file path> if it is not directory, --source-base mode is
             enabled. If it is directory, minimerge will take as subject all  
             files from that directory and will treat it as a source base.    
          -ir ignore Require.js deps (default: false)                         
          --index It will ignore merging and generate prefix,suffix list      
          --prefix <prefix for index generation>                              
          --suffix <suffix for index generation>                              
          --not-relative <absolute paths index generation, default: false>    
          -vv very verbose                                                    
          -v verbose                                                          
          -nd <process no dependencies in files? see: //= and //:include>     
          -dl <cut line contains strings(comma separated)>                    
           example: /*D*/ or /*X*/ (defaults: /*D*/,//=,//:include,//= require)           
          -df <file exclude patterns, defaults:                               
           /****!ignore!****/,////!ignore!////,##!ignore!## (comma separated) 
          -dw <wrapped text cut by strings(comma separated)                   
           example: /*start*/ <cut text> /*~start*/ in file, command line arg 
           will be: -dw /*~start*/ (keep ~ unique, it's used to mark endings. 
         --parse-only-first-comment-dependencies for performance reasons     
           you may want to parse dependencies contents only for first lines   
           starting in a file as a comment (it means that minimerege will      
           not go through file contents to analyze dependencies and only till         
           comment like contents is present)
         --add-base If this option is added and --index is used the file list
           index will have source base appended accordingly to where it is found.                               
         --help,-h Shows this text                            


For even more examples, run java -jar MiniMerge.jar -h


Example:

  Merging all javascript from "src" directory and analysing dependencies:


    java -jar MiniMerge.jar -s src -o output.js -i .js
    
  Command will cause fetching all files from src directory recursively.
  If any path in files is defined as dependency:


    //:include my/file.js

  Then it is expected to be in my/file.js location, by default source base is a current execution location.
  To change source base, add --source-base parameter, multiple values comma separated are allowed:


    java -jar MiniMerge.jar -s src -o output.js -i .js --source-base "src,other"

  Now, the dependency is expected to be in src/my/file.js or other/my/file.js
  location. -i option defines matched string(s) at the end of file name (multiple options allowed, comma separated)

  To list files only instead of merging their contents, add --index option.


    java -jar MiniMerge.jar -s src -o output.js -i .js --source-base "src,other" --index

  To see the output in console and also other useful information use -v (verbosive) or -vv (very verbosive) option.

  To add prefix and suffix to listed index, add --prefix and --suffix arguments, like below:

  
    java -jar MiniMerge.jar -s src -o output.js -i .js --source-base "src,other" --index --prefix "<script src='" --suffix "'></script>"

  During merging files process its very useful to "cut" out some of its contents, like
debugging blocks, testing code etc., miniMerge has 3 levels of content filtering, single line level,
block of lines and entire files. Please see, -dl, -dw and -df options.

  -dl is used to delete lines containing one of comma separated values passed to -dl, for example:
    -dl "console.log,console.debug" Will cause removing all lines from sources that contain console.log or console.debug strings.
  -dw is used to exclude entire blocks, it requires special format, for example:
    -dw "/~match/" will cause blocks starting with /match/ and ending with /~match/
    to be excluded from merge process. -dw, similary to -dl, accepts multiple entries.
  -df is used to excluded files. Any comma separated value that is contained by file will cause to exclude that file from merge process.
  This option applies also to --index option (unlike to -dl and -dw).

  To make miniMerge stop analyzing dependencies use -nd option.

  To change current working directory for miniMerge, use --cwd option.

  miniMerge by default use relative paths, to make it using absolute paths use 
  --not-relative option



