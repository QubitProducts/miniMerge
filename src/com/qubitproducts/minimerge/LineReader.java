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
public class LineReader {

    BufferedReader fileReader = null;
    private File file = null;
    private int lnum = 0;
    private LineReader lineReader = null;
    private List<String> lines = new ArrayList<String>();

    private static HashMap<String, List<String>> cache = 
        new HashMap<String, List<String>>();

    public static void clearCache() {
        cache = new HashMap<String, List<String>>();
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
