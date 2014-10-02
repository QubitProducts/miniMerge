/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package com.qubitproducts.minimerge;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileNotFoundException;
import java.io.FileReader;
import java.io.IOException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;

/**
 *
 * @author Peter Fronc <peter.fronc@qubitdigital.com>
 */
public class LineReader  {

  BufferedReader fr = null;
  private File file = null;
  private int lnum = 0;
  private LineReader lr = null;
  private List<String> lines = new ArrayList<String>();
  
  private static HashMap<String, List> cache = new HashMap<String, List>();
  
  public static void clearCache () {
    cache = new HashMap<String, List>();
  }
  
  public LineReader(List<String> strings) {
    lines = strings;
  }

  public LineReader(File file) throws FileNotFoundException {
    List l = cache.get(file.getAbsolutePath());
    if (l != null) {
      lr = new LineReader(l);
    } else {
      fr = new BufferedReader(new FileReader(file));
      this.file = file;
    }
  }
  
  private String readCachedLine () {
    if (lnum >= lines.size()) return null;
    return lines.get(lnum++);
  }
  
  public String readLine () throws IOException {
    if (lr != null) {
        return lr.readCachedLine();
    }
    
    String line = fr.readLine();
    if (line != null) {
      lines.add(line);
    } else {
      //end of stream
      cache.put(file.getAbsolutePath(), lines);
    }
    return line;
  }
  
  public void close() throws IOException {
    if (fr != null) fr.close();
  }

}