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


package com.qubitproducts.compilejs.processors;

import com.qubitproducts.compilejs.fs.LineReader;
import com.qubitproducts.compilejs.MainProcessor;
import com.qubitproducts.compilejs.Processor;
import static com.qubitproducts.compilejs.MainProcessorHelper.chunkToExtension;
import java.io.BufferedReader;
import java.io.File;
import java.io.IOException;
import java.io.StringReader;
import java.util.List;
import java.util.logging.Level;
import java.util.logging.Logger;

/**
 *
 * @author piotr
 */
public class InjectionProcessor implements Processor {
    String prefix = "";
    String suffix = "";
    String INJECT_STR = "//:inject";
    private MainProcessor mprocessor;
    
    private boolean replacingLine = false;
    
    public InjectionProcessor(){
        super();
    };    
    public InjectionProcessor(MainProcessor mprocessor){
        super();
        this.mprocessor = mprocessor;
    };
    
    public InjectionProcessor(
            String prefix,
            String suffix) {
        super();
        this.prefix = prefix;
        this.suffix = suffix;
    }
    
    public void process(List<Object[]> chunks, String extension) {
        for (Object[] chunk : chunks) {
            String key = (String) chunk[0];
//            String skey = chunkToExtension(key);
//            if (skey != null && skey.equals(JS_TEMPLATE_NAME)) {
            try {
                BufferedReader reader
                    = new BufferedReader(
                        new StringReader(((StringBuilder) chunk[1]).toString()));
                String line = reader.readLine();
                StringBuilder builder = new StringBuilder(this.prefix);
                while (line != null) {
                    boolean skip = false;
                    if (line.contains(INJECT_STR)) {
                        int injectStart = line.indexOf(INJECT_STR);
                        String formula = line.substring(injectStart);
                        String[] parts = formula.split(" ");
                        if (parts.length > 1) {
                            
                            //pick the path
                            int j = 1;
                            
                            String path = 
                                MainProcessor.translateClassPath(parts[j]) 
                                  + ".js";
                            
                            while(path == null || path.trim().equals("")) {
                                path = parts[++j];
                            }
                            
                            //check the path
                            File f= new File(path);
                            boolean exists = false;
                            if (mprocessor != null) {
                                String cwd = mprocessor.getCwd();
                                String[] srcBase = mprocessor.getSourceBase();
                                for (String str : srcBase) {
                                    File tmp = new File(cwd, str);
                                    tmp = new File(tmp, path);
                                    if (tmp.exists()) {
                                        f = tmp;
                                        exists = true;
                                        break;
                                    }
                                }
                            }
                            //process file if exists
                            if (exists || f.exists()) {
                                skip = true;
                                if (!this.isReplacingLine()) {
                                    String pre = line.substring(0, injectStart);
                                    builder.append("\n");
                                    builder.append(pre);
                                }
                                
                                LineReader lr = 
                                    new LineReader(f, mprocessor.getLineReaderCache());
                                String l = null;
                                while((l = lr.readLine()) != null) {
                                    builder.append(l);
                                    builder.append("\n");
                                }
                                
                                if (!this.isReplacingLine()) {
                                //bring suffixed stuff...
                                    for (int i = j + 1; i < parts.length; i++) {
                                        builder.append(" ");
                                        builder.append(parts[i]);
                                    }
                                }
                            }
                        }
                    }
                    
                    if (!skip) {
                        //same
                        builder.append(line);
                    }
                    
                    line = reader.readLine();
                    if (line != null){
                        builder.append("\n");
                    }
                }
                builder.append(this.suffix);
                chunk[0] = "js";
                chunk[1] = builder;
            } catch (IOException ex) {
                Logger.getLogger(InjectionProcessor.class.getName())
                    .log(Level.SEVERE, null, ex);
            }
//            }
        }
    }

    /**
     * @return the replacingLine
     */
    public boolean isReplacingLine() {
        return replacingLine;
    }

    /**
     * @param replaceLine the replacingLine to set
     */
    public void setReplacingLine(boolean replaceLine) {
        this.replacingLine = replaceLine;
    }
}

