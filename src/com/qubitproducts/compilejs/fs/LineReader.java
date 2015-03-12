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
 *
 *  @author Peter (Piotr) Fronc 
 */
package com.qubitproducts.compilejs.fs;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileNotFoundException;
import java.io.FileReader;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Map;
import java.util.List;

/**
 *
 * @author Peter Fronc <peter.fronc@qubitdigital.com>
 */
public class LineReader {

    BufferedReader fileReader = null;
    private File file = null;
    private int lnum = 0;
    private List<String> lines = new ArrayList<String>();

    public  Map<String, List<String>> cache = null;

//    @Override
//    public void finalize() throws Throwable {
//        super.finalize();
//    }
    private void setupForArray(List<String> lines) {
        this.lines = lines;
        cached = true;
    }

    private boolean cached = false;

    public LineReader(List<String> strings) {
        setupForArray(lines);
    }

    public LineReader(File file, Map<String, List<String>> pcache)
        throws FileNotFoundException {
        List<String> cachedLines = null;
        
        if (pcache != null) {
            cachedLines = pcache.get(file.getAbsolutePath());
        }
        
        if (cachedLines != null) {
            setupForArray(cachedLines);
        } else {
            fileReader = new BufferedReader(new FileReader(file));
            this.file = file;
            this.cache = pcache;
        }
    }

//    public LineReader(File file) throws FileNotFoundException {
//        this(file, null);
//    }

    public String readLine() throws IOException {
        if (cached) {
            return this.readCachedLine();
        } else {
            String line = fileReader.readLine();
            if (this.cache != null) {
                if (line != null) {
                    lines.add(line);
                } else {
                    //end of stream
                    if (this.cache != null) {
                        cache.put(file.getAbsolutePath(), lines);
                    }
                }
            }
            return line;
        }
    }

    public void close() throws IOException {
        if (fileReader != null) {
            fileReader.close();
        }
    }

    private String readCachedLine() {
        if (lnum == lines.size()) {
            return null;
        }
        return lines.get(lnum++);
    }
}
