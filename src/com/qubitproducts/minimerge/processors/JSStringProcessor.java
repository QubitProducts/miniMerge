package com.qubitproducts.minimerge.processors;

import com.qubitproducts.minimerge.Processor;
import static com.qubitproducts.minimerge.MiniProcessorHelper.chunkToExtension;
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
public class JSStringProcessor implements Processor {
    public static String JS_TEMPLATE_NAME = "js.string";
    String prefix;
    String suffix;
    String separator;
        
    public JSStringProcessor(
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
                    Logger.getLogger(JSStringProcessor.class.getName())
                        .log(Level.SEVERE, null, ex);
                }
            }
        }
    }

}

