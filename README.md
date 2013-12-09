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

[...]
//:include css/style.css
[...]
//:include ../otherdir/license.txt
[...]

will make program to order merged files contents as paths below: 

[srcBase]/css/style.css
[scrBase]/../otherdir/license.txt
[srcBase]myFile.css

[srcBase] is runtime --src-base argument, by default, it is a current
 directory value. Dependency detection works recursively.
Program supports basic sprockets style dependencies addressing for JS files, 
//=require path will be translated to //:include path.js

Program also can filter contents by:

- line of text (keyword, for example: //delete )

- block of text (/*~keyword*/,<--~keyword--> etc.). Using .~keyword. will 
filter:
    AAA
    .keyword.
    BBB
    .~keyword.
    CCC
to:
    AAA



    CCC

- entire file (keyword, for example, file containing: /**exclude this file**/)

Content filtering is applied to final merged output file only (after merging 
files set).

Program can simply list files instead of merging its contents by using --index 
option - in addition, you can use prefix and suffix for each file path in the
list to be prefixed/suffixed. Files list is same ordered like in merge process.

When using MiniMerge it is strongly recommended to specify source base and the
file where process starts from. Please see usage list for more details.

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
   example: /*D*/ or /*X*/ (defaults: /*D*/,//=,//:include)           
  -df <file exclude patterns, defaults:                               
   /****!ignore!****/,////!ignore!////,##!ignore!## (comma separated) 
  -dw <wrapped text cut by strings(comma separated)                   
   example: /*start*/ <cut text> /*~start*/ in file, command line arg 
   will be: -dw /*~start*/ (keep ~ unique, it's used to mark endings. 
 --parse-only-first-comment-dependencies for performance reasons     
   you may want to parse dependencies contents only for first lines   
   starting in a file as a comment (it means that minimerege will      
   not go through file contents to analyse deps and only till         
   comment like contents is present)                                  
 --help,-h Shows this text                            

