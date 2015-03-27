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

import com.qubitproducts.compilejs.Processor;
import static com.qubitproducts.compilejs.MainProcessorHelper.chunkToExtension;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.StringReader;
import java.util.List;
import java.util.logging.Level;
import java.util.logging.Logger;

/**
 *
 * @author piotr
 */
public class JSTemplateProcessor implements Processor {
    public static String JS_TEMPLATE_NAME = "js.template";
    String prefix;
    String suffix;
    String separator;
    
    public JSTemplateProcessor(
            String prefix,
            String suffix,
            String separator) {
        this.prefix = prefix;
        this.suffix = suffix;
        this.separator = separator;
    }
    
    public void process(List<Object[]> chunks, String extension) {
        if (extension == null || !extension.equals("js")) {
            return;
        }
        for (Object[] chunk : chunks) {
            String key = (String) chunk[0];
            String skey = chunkToExtension(key);
            if (skey != null && skey.equals(JS_TEMPLATE_NAME)) {
                try {
                    BufferedReader reader =
                        new BufferedReader(
                            new StringReader(((StringBuilder)chunk[1]).toString()));
                    String line = reader.readLine();
                    StringBuilder builder = new StringBuilder(this.prefix);
                    while(line != null) {
                        line = line.replace("\\", "\\\\");
                        line = line.replace("\"", "\\\"");
                        builder.append(line);
                        line = reader.readLine();
                        if (line != null){
                            builder.append(this.separator);
                        }
                    }
                    builder.append(this.suffix);
                    chunk[0] = "js";
                    chunk[1] = builder;
                } catch (IOException ex) {
                    Logger.getLogger(JSTemplateProcessor.class.getName())
                        .log(Level.SEVERE, null, ex);
                }
            }
        }
    }

}

