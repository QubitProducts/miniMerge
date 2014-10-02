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
    cache.clear();
  }
  
  public LineReader(List<String> strings) {
    lines = strings;
  }

  public LineReader(File file) throws FileNotFoundException {
    if (cache.containsKey(file.getAbsolutePath())) {
      lr = new LineReader(cache.get(file.getAbsolutePath()));
      return;
    }
    fr = new BufferedReader(new FileReader(file));
    this.file = file;
  }
  
  private String readCachedLine () {
    return lines.get(lnum++);
  }
  
  public String readLine () throws IOException {
    if (lr != null) {
      return lr.readCachedLine();
    }
    
    String line = fr.readLine();
    lines.add(line);
    return line;
  }
  
  public void close() throws IOException {
    if (file != null) cache.put(file.getAbsolutePath(), lines);
    if (fr != null) fr.close();
  }
}

class Cluster {
  ArrayList buf;
  int lenght = 0;
  int cluseterSize = 4096;

  Cluster() {
    this.buf = new ArrayList();
    
  }
  
}