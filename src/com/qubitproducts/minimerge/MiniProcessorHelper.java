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
import java.util.Iterator;
import java.util.Map;
import java.util.logging.Level;
import java.util.logging.Logger;

/**
 *
 * @author Peter (Piotr) Fronc <peter.fronc@qubitproducts.com>
 */
public class MiniProcessorHelper {
  
  public static void log (String msg) {
    MiniProcessor.log(msg);
  }
  
  /**
   * Function strips file from wrapping strings.
   * @param file
   * @param wraps
   * @throws FileNotFoundException
   * @throws IOException
   * @throws Exception 
   */
  public static void stripFileFromWraps(File file, String[] wraps)
          throws FileNotFoundException, IOException, Exception {
    for (int i = 0; i < wraps.length; i++) {
      stripFileFromWrap(file, wraps[i]);
    }
  }

  /**
   * Function strips file from wrapping string.
   * String wrapping content must consist on ~ pattern,
   * which translates to any starting A string can open wrapped context
   * and any string with ~ that gives same A after replacing first ~ occurrence.
   * 
   * @param reader
   * @param writer
   * @param wrap
   * @throws IOException 
   */
  public static void stripFromWrap(BufferedReader reader,
                                   BufferedWriter writer,
                                   String wrap) throws IOException {
    String line;
    String start = wrap.replaceFirst("~", "");
    String end = wrap;
    boolean ignore = false;
    while ((line = reader.readLine()) != null) {
      if (start.length() > 0 && line.contains(start)) {
        ignore = true;
      }
      if (!ignore) {
        writer.append(line);
      }
      if (end.length() > 0 && line.contains(end)) {
        ignore = false;
      }
      writer.append("\n");
    }
    writer.flush();
  }

  /**
   * Function stripping from wraps string buffers.
   * String wrapping content must consist on ~ pattern,
   * which translates to any starting A string can open wrapped context
   * and any string with ~ that gives same A after replacing first ~ occurrence.
   * @param reader
   * @param writer
   * @param wraps
   * @throws IOException 
   */
  public static void stripFromWraps(BufferedReader reader, 
                                    BufferedWriter writer, 
                                    String[] wraps) throws IOException {
    for (int i = 0; i < wraps.length; i++) {
      stripFromWrap(reader, writer, wraps[i]);
    }
  }
  
  /**
   * Copy files. Simple as is, plain copy.
   * @param from
   * @param to
   * @throws IOException 
   */
  public static void copyTo(File from, File to) throws IOException {
    BufferedReader in = null;
    BufferedWriter out = null;
    try {
      in = new BufferedReader(new FileReader(from));
      out = new BufferedWriter(new FileWriter(to));
      int character;
      while ( (character = in.read()) != -1) {
        out.write(character);
      }
    } catch (FileNotFoundException ex) {
      Logger.getLogger(MiniProcessorHelper.class.getName()).log(Level.SEVERE, null, ex);
    } finally {
      if(in != null) in.close();
      if(out != null) out.close();
    }
  }
  
  /**
   * Strip single file from wraps.
   * String wrapping content must consist on ~ pattern,
   * which translates to any starting A string can open wrapped context
   * and any string with ~ that gives same A after replacing first ~ occurrence.
   * @param file
   * @param wrap
   * @throws FileNotFoundException
   * @throws IOException
   * @throws Exception 
   */
  public static void stripFileFromWrap(File file, String wrap)
          throws FileNotFoundException, IOException, Exception {
    BufferedReader in = null;
    BufferedWriter out = null;
    File _file = new File(file.getAbsolutePath() + "~");
    
    if (file.exists()) {
      log("    Stripping from " + wrap);
      //log(">>> File DOES exist: " + file.getAbsolutePath());
      try {
        FileReader fr = new FileReader(file);
        in = new BufferedReader(fr);
        FileWriter fw = new FileWriter(_file);
        out = new BufferedWriter(fw);
        stripFromWrap(in, out, wrap);
        
        out.close();
        in.close();
        
        log(">>> Merged to: " + file.getAbsolutePath());
        
        if (!_file.renameTo(file)) {
          //lets try harder...
          log("Renaming failed (it may happen on some systems),"
                  + " directly copying over...");
          try {
            log("Copying " + _file.getAbsolutePath() + " to "
                    + file.getAbsolutePath());
            copyTo(_file, file);
          } catch (IOException e) {
            String msg = " Could not copy over the file nor delete tmp!"
                + "\ntmp path:"+ _file.getAbsolutePath() + "\nreal: "
                + file.getAbsolutePath();
            log(e.getMessage());
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
        
        log("Cleaning. Deleting tmp file... " + _file.getAbsolutePath());
        
        _file.delete();
        _file = null;
      }
    } else {
          log(">>> File DOES NOT exist! Some of js files may"
             + " point to dependencies that do not match -s and"
             + " --js-deps-prefix  directory! Use -vv and see whats missing."
             + "\n    File failed to open: "
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
      if (string.charAt(i) == '>') {
        end = i;
        break;
      }
      if (start >= 0 && end < 0) {
        result.append(string.charAt(i));
      }
      if (string.charAt(i) == '<') {
        start = i;
      }
    }
    return result;
  }

  /**
   * Prefix and suffix given paths strings with pre and suf strings.
   * @param paths
   * @param pre
   * @param suf
   * @param appendSrcBase
   * @return String result by concatenating all map items with pre/suffixed 
   * strings.
   */
  static public String getPrefixScriptPathSuffixString(
          Map<String, String> paths,
          String pre,
          String suf,
          boolean appendSrcBase,
          boolean unixStyle) {
    StringBuilder builder = new StringBuilder();
    Iterator it = paths.keySet().iterator();
    while (it.hasNext()) {
      builder.append(pre);
      String path = (String)it.next();
      
      if (appendSrcBase) {
        String srcDir = paths.get(path);
        builder.append(srcDir);
        if (!srcDir.endsWith(File.separator)) {
          builder.append(File.separator);
        }
      }
      
      builder.append(path);
      builder.append(suf);
    }
    
    if (File.separatorChar == '\\' && unixStyle) {
      return builder.toString().replaceAll("\\\\", "/");
    }
    
    return builder.toString();
  }
}
