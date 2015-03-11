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
import java.util.HashMap;
import java.util.List;

/**
 *
 * @author Peter Fronc <peter.fronc@qubitdigital.com>
 */
public class LineReader {

    BufferedReader fileReader = null;
    private File file = null;
    private int lnum = 0;
    private LineReader lineReader = null;
    private List<String> lines = new ArrayList<String>();

    public final static HashMap<String, List<String>> cache = 
        new HashMap<String, List<String>>();

    public static void clearCache() {
        cache.clear();
    }

    public LineReader(List<String> strings) {
        lines = strings;
    }

    public LineReader(File file) throws FileNotFoundException {
        List<String> cachedLines = cache.get(file.getAbsolutePath());
        if (cachedLines != null) {
            lineReader = new LineReader(cachedLines);
        } else {
            fileReader = new BufferedReader(new FileReader(file));
            this.file = file;
        }
    }

    public String readLine() throws IOException {
        if (lineReader != null) {
            return lineReader.readCachedLine();
        }

        String line = fileReader.readLine();
        if (line != null) {
            lines.add(line);
        } else {
            //end of stream
            cache.put(file.getAbsolutePath(), lines);
        }
        return line;
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
