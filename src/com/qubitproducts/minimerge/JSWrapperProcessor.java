/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package com.qubitproducts.minimerge;

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
