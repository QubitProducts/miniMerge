/*
 *  Copyright  @ QubitProducts.com
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
 *
 *  @author Peter (Piotr) Fronc 
 */


package com.qubitproducts.compilejs;

import static com.qubitproducts.compilejs.Log.LOG;
import static com.qubitproducts.compilejs.Log.log;
import com.qubitproducts.compilejs.fs.LineReader;
import com.qubitproducts.compilejs.fs.CFile;
import com.qubitproducts.compilejs.fs.FSFile;
import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.FileNotFoundException;
import java.io.IOException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

/**
 *
 * @author Peter (Piotr) Fronc <peter.fronc@qubitproducts.com>
 */
public class MainProcessorHelper {
  
  public static final String RET = "\n";
  public static final String EMPTY = "";
  public static final String TIL = "~";
  public static final char TILC = '~';
  
  /**
   * Function strips file from wrapping strings.
   * @param file
   * @param wraps
   * @throws FileNotFoundException
   * @throws IOException
   * @throws Exception 
   */
  public static void stripFileFromWraps(FSFile file, String[] wraps, String replacement)
          throws FileNotFoundException, IOException, Exception {
    
    if (wraps == null || wraps.length == 0) return;
    
    List<String> lines = new ArrayList<String>();
    BufferedReader reader = null;
    
    try {
      reader = file.getBufferedReader();
      String line = null;
      while ((line = reader.readLine()) != null) {
        lines.add(line);
      }
      for (String wrap : wraps) {
        lines = stripFromWrap(lines, wrap, replacement);
      }
    } finally {
      if (reader != null) reader.close();
    }
    
    BufferedWriter writer = null;
    try {
      writer = file.getBufferedWriter();
      for (String line : lines) {
        writer.write(line + RET);
      }
      writer.flush();
    } finally {
      if (writer != null) writer.close();
    }
  }

  static private final Pattern stripFromWrapPattern = 
      Pattern.compile("[^a-zA-Z0-9_\\\\.]");
     
  /**
   * Function strips file from wrapping string.
   * String wrapping content must consist on ~ pattern,
   * which translates to any starting A string can open wrapped context
   * and any string with ~ that gives same A after replacing first ~ occurrence.
   * 
   * @param reader
   * @param writer
   * @param wrap
   * @param replacement
   * @throws IOException 
   */
  public static void stripFromWrap(BufferedReader reader,
                                   BufferedWriter writer,
                                   String wrap,
                                   String replacement) throws IOException {
    String line;
    String start = replaceFirstChar(wrap, TILC, null);
    String end = wrap;
    boolean ignore = false;
    int minLen = start.length() - 1;
    while ((line = reader.readLine()) != null) {
      if (!ignore && (start.length() > minLen) && line.contains(start)) {
        ignore = true;
      }
      if (!ignore) {
        writer.append(line);
        writer.append(RET);
      } else if (replacement != null) {
        writer.append(replacement);
        writer.append(RET);
      }
      if (end.length() > 0 && line.contains(end)) {
        ignore = false;
      }
    }
    writer.flush();
  }
    
    public static HashMap<String, String> chunkToExtensionCache =
        new HashMap<String, String>();
    
    public static String chunkToExtension(String in) {
        if (in == null) {
            return null;
        }
        
        String cached = chunkToExtensionCache.get(in);
        
        if (cached != null) {
          return cached;
        }
        
        //dash removed as used in html comments
        String res = stripFromWrapPattern.matcher(in).replaceAll(EMPTY);
        chunkToExtensionCache.put(in, res);
        return res;
        //return in.replaceAll("[^a-zA-Z0-9_\\\\.]", EMPTY);
    }
    
    /**
     * EMPTY is a default output, when no wraps is 
     * defined or blocks out of wraps.
     * Chunks names returned are the definitions used to close the block.
     * @param lines
     * @param wraps
     * @param defaultExtension
     * @return Array of Object[String, StringBuilder]
     * @throws IOException 
     */
    public static List<Object[]> getStringInChunks(
                List<String> lines,
                List<String> wraps,
                String defaultExtension)
            throws IOException {
        if (defaultExtension == null) {
            defaultExtension = EMPTY;
        }
        //chunks are the xxx~namexxx elements
        ArrayList<Object[]> chunks = new ArrayList<Object[]>();

        StringBuilder defaultBuilder = new StringBuilder();
        StringBuilder builder = new StringBuilder();
        String endingWrap = null;
        
        //prepare wraps
        ArrayList<String[]> startingWraps = new ArrayList<String[]>();
        for (String wrap : wraps) {
            if (wrap != null && !wrap.equals(EMPTY))
            startingWraps.add(new String[]{
                replaceFirstChar(wrap, TILC, null),
                wrap
            });
        }
        
        boolean isChunk = false;
//        int size = lines.size();
        for (String line : lines) {
            if (line == null) {
                continue;
            }
            
            if (endingWrap == null) {
                endingWrap = containsAny(line, startingWraps);
            }
            
            if (endingWrap != null && line.contains(endingWrap)) {
                chunks.add(new Object[]{endingWrap, builder});
                builder = new StringBuilder();
                isChunk = false;
                endingWrap = null;
            } else {
                //proceed normally
                if (isChunk) {
                    builder.append(line);
                    //if (i < size) {
                        builder.append(RET);
                    //}
                } else {
                    if (endingWrap == null) {
                        defaultBuilder.append(line);
                        //if (i < size) {
                            defaultBuilder.append(RET);
                        //}
                    } else {
                        isChunk = true;//from next line read builder
                        chunks.add(new Object[]{defaultExtension, defaultBuilder});
                        defaultBuilder = new StringBuilder();
                    }
                }

            }
        }
        
        //flush unclosed ending
        if (endingWrap != null) {
            chunks.add(new Object[]{endingWrap, builder});
        } else {
            chunks.add(new Object[]{defaultExtension, defaultBuilder});
        }
        return chunks;
    }
  
    static private String containsAny(String line, List<String[]> strings) {
        for (String[] string : strings) {
            if (line.contains(string[0])) {
                return string[1];
            }
        }
        return null;
    }
    
    //@todo optimise
    static public String replaceFirstChar(String string, char ch, String with) {
      int len = string.length();
      StringBuilder builder = new StringBuilder();
      boolean found = false;
      for (int i = 0; i < len; i++) {
        char c = string.charAt(i);
        if (found || c != ch) {
          builder.append(c);
        } else {
          found = true;
          if (with != null) {
            builder.append(with);
          }
        }
      }
      return builder.toString();
    }
    
  public static List<String> stripFromWrap(
                                  List<String> lines,
                                  String wrap,
                                  String replacement) throws IOException {
    ArrayList<String> result = new ArrayList<String>();
    
    String start = replaceFirstChar(wrap, TILC, null);
    String end = wrap;
    boolean ignore = false;
    int minLen = wrap.length() - 1;
    if (lines != null) for (String line : lines) {
      if (!ignore && (start.length() > minLen) && line.contains(start)) {
        ignore = true;
      }
      if (!ignore) {
        result.add(line);
      } else if (replacement != null) {
        result.add(replacement);
      }
      if (end.length() > 0 && line.contains(end)) {
        ignore = false;
      }
      //result.add(RET);
    }
    return result;
  }

  
  public static void stripFromWrap(LineReader reader,
                                   BufferedWriter writer,
                                   String wrap,
                                   String replacement) throws IOException {
    String line;
    String start = replaceFirstChar(wrap, TILC, null);
    String end = wrap;
    boolean ignore = false;
    int minLen = wrap.length() - 1;
    while ((line = reader.readLine()) != null) {
      if (!ignore && (start.length() > minLen) && line.contains(start)) {
        ignore = true;
      }
      if (!ignore) {
        writer.append(line);
      } else if (replacement != null) {
        writer.append(replacement);
      }
      if (end.length() > 0 && line.contains(end)) {
        ignore = false;
      }
      writer.append(RET);
    }
    writer.flush();
  }
  
  /**
   * 
   * @param lines
   * @param wraps
   * @param replacement
   * @return
   * @throws IOException 
   */
  public static List<String> stripFromWraps(List<String> lines, 
                                  List<String> wraps,
                                  String replacement) throws IOException {
      for (String wrap : wraps) {
        lines = stripFromWrap(lines, wrap, replacement);
      }
      return lines;
  }
  
  public static List<String> stripFromWraps(List<String> lines, 
                                  String[] wraps,
                                  String replacement) throws IOException {
      for (String wrap : wraps) {
        lines = stripFromWrap(lines, wrap, replacement);
      }
      return lines;
  }
  
  public static void stripFromWraps(BufferedReader reader, 
                                    BufferedWriter writer, 
                                    String[] wraps,
                                    String replacement) throws IOException {
    for (String wrap : wraps) {
      stripFromWrap(reader, writer, wrap, replacement);
    }
  }
  
  /**
   * Copy files. Simple as is, plain copy.
   * @param from
   * @param to
   * @throws IOException 
   */
  public static void copyTo(FSFile from, FSFile to) throws IOException {
    BufferedReader in = null;
    BufferedWriter out = null;
    try {
      in = from.getBufferedReader();
      out = to.getBufferedWriter();
      int character;
      while ( (character = in.read()) != -1) {
        out.write(character);
      }
    } catch (FileNotFoundException ex) {
      if (LOG) {
        log("File not found: " + ex.getMessage());
      }
    } finally {
      if(in != null) in.close();
      if(out != null) out.close();
    }
  }
  
  /**
   * @Deprecated
   * 
   * Strip single file from wraps.
   * String wrapping content must consist on ~ pattern,
   * which translates to any starting A string can open wrapped context
   * and any string with ~ that gives same A after replacing first ~ occurrence.
   * @param file
   * @param wrap
   * @param replacement
   * @throws FileNotFoundException
   * @throws IOException
   * @throws Exception 
   */
  public static void stripFileFromWrap(FSFile file, String wrap, String replacement)
          throws FileNotFoundException, IOException, Exception {
    BufferedReader in = null;
    BufferedWriter out = null;
    FSFile _file = new CFile(file.getAbsolutePath() + TIL);
    
    if (file.exists()) {
      if (LOG)log("    Stripping from " + wrap);
      //if (LOG)log(">>> FSFile DOES exist: " + file.getAbsolutePath());
      try {
        in = file.getBufferedReader();
        out = _file.getBufferedWriter();
        stripFromWrap(in, out, wrap, replacement);
        
        out.close();
        in.close();
        
        if (LOG)log(">>> Merged to: " + file.getAbsolutePath());
        
        if (!_file.renameTo(file)) {
          //lets try harder...
          if (LOG)log("Renaming failed (it may happen on some systems),"
                  + " directly copying over...");
          try {
            if (LOG)log("Copying " + _file.getAbsolutePath() + " to "
                    + file.getAbsolutePath());
            copyTo(_file, file);
          } catch (IOException e) {
            String msg = " Could not copy over the file nor delete tmp!"
                + "\ntmp path:"+ _file.getAbsolutePath() + "\nreal: "
                + file.getAbsolutePath();
            if (LOG)log(e.getMessage());
            throw (new Exception(msg));
          }
        }
      } finally {
        if (out != null) {
          out.close();
        }
        if (in != null) {
          in.close();
        }
        
        if (LOG)log("Cleaning. Deleting tmp file... " + _file.getAbsolutePath());
        
        _file.delete();
        _file = null;
      }
    } else {
          if (LOG)log(">>> FSFile DOES NOT exist! Some of js files may"
             + " point to dependencies that do not match -s and"
             + " --js-deps-prefix  directory! Use -vv and see whats missing."
             + "\n    FSFile failed to open: "
             + file.getAbsolutePath());
    }
  }
  
  /**
   * Decode RequireJS path pattern to simple path.
   * It accepts string and translates is to the real path (relative).
   * //= require <file/path> will translate to file/path
   * @param string
   * @return
   */
  static StringBuffer getRequirePath(String string) {
    int start = -1;
    int end = -1;
    int len = string.length();
    StringBuffer result = new StringBuffer();

    for (int i = 0; i < len; i++) {
      char ch = string.charAt(i);
      if (ch == '>') {
        end = i;
        break;
      }
      if (start >= 0 && end < 0) {
        result.append(ch);
      }
      if (ch == '<') {
        start = i;
      }
    }
    return result;
  }

    static public String getPrefixScriptPathSuffixString(
        Map<String, String> paths,
        String prefix,
        String suffix,
        boolean appendSrcBase,
        boolean unixStyle) {
        
        HashMap<String, String> prefixes = new HashMap<String, String>();
        HashMap<String, String > suffixes = new HashMap<String, String>();
        
        prefixes.put(EMPTY, prefix);
        suffixes.put(EMPTY, suffix);
        
        return getPrefixScriptPathSuffixString(
            paths,
            prefixes,
            suffixes,
            appendSrcBase,
            unixStyle);
    }
//    static private final Pattern getPrefixScriptPathSuffixStringPattern = 
//                                                        Pattern.compile("\\\\");
    
    static final char FSLSH = '/';
    static final char SLSH = '\\';
    /**
     *
     * @param paths
     * @param prefixes
     * @param suffixes
     * @param appendSrcBase
     * @param unixStyle
     * @return
     */
    static public String getPrefixScriptPathSuffixString(
        Map<String, String> paths,
        Map<String, String> prefixes,
        Map<String, String> suffixes,
        boolean appendSrcBase,
        boolean unixStyle) {
      StringBuilder builder = new StringBuilder();
      Iterator it = paths.keySet().iterator();
      String extension, pre = null, suf = null;
      
      String defaultPrefix = prefixes.get(EMPTY);
      if (defaultPrefix == null) {
          defaultPrefix = EMPTY;
      }
      
      String defaultSuffix = suffixes.get(EMPTY);
      if (defaultSuffix == null) {
          defaultSuffix = EMPTY;
      }
      
      while (it.hasNext()) {
          String path = (String) it.next();

          int index = path.lastIndexOf(".") + 1;
          if (index > 0 && index <= path.length()) {
              extension = path.substring(index);
              pre = prefixes.get(extension);
              suf = suffixes.get(extension);
          }

          if (pre == null) {
              pre = defaultPrefix;
          }

          if (suf == null) {
              suf = defaultSuffix;
          }
          
          builder.append(pre);

          if (appendSrcBase) {
              String srcDir = paths.get(path);
              builder.append(srcDir);
              if (!srcDir.endsWith(CFile.separator)) {
                  builder.append(CFile.separator);
              }
          }

          builder.append(path);
          builder.append(suf);
      }
    
    if (CFile.separatorChar == '\\' && unixStyle) {
      return builder.toString().replace(SLSH, FSLSH);
//      return getPrefixScriptPathSuffixStringPattern
//                    .matcher(builder.toString())
//                        .replaceAll(FSLSH);
      //return builder.toString().replaceAll("\\\\", FSLSH);
    }
    
    return builder.toString();
  }
}
