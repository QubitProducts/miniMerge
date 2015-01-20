package com.qubitproducts.minimerge.processors;

import com.qubitproducts.minimerge.Processor;
import java.util.List;

/**
 *
 * @author piotr
 */
public class JSWrapperProcessor implements Processor {

    
    public JSWrapperProcessor() {
    }
    
    public void process(List<Object[]> chunks, String extension) {
        if (extension == null || !extension.equals("js")) {
            return;
        }
        chunks.add(0, new Object[]{"js", new StringBuilder("(function () {\n")});
        chunks.add(new Object[]{"js", new StringBuilder("\n}());\n")});
    }

}
