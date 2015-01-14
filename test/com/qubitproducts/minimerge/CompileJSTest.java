/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package com.qubitproducts.minimerge;

import java.util.Map;
import org.junit.After;
import org.junit.AfterClass;
import org.junit.Before;
import org.junit.BeforeClass;
import org.junit.Test;
import static org.junit.Assert.*;

/**
 *
 * @author piotr
 */
public class CompileJSTest {
    
    public CompileJSTest() {
    }
    
    @BeforeClass
    public static void setUpClass() {
    }
    
    @AfterClass
    public static void tearDownClass() {
    }
    
    @Before
    public void setUp() {
    }
    
    @After
    public void tearDown() {
    }

    /**
     * Test of printArgs method, of class CompileJS.
     */
    @Test
    public void testPrintArgs() {
        System.out.println("printArgs");
        CompileJS.printArgs();
        // TODO review the generated test code and remove the default call to fail.
        fail("The test case is a prototype.");
    }

    /**
     * Test of printUsage method, of class CompileJS.
     */
    @Test
    public void testPrintUsage() {
        System.out.println("printUsage");
        CompileJS.printUsage();
        // TODO review the generated test code and remove the default call to fail.
        fail("The test case is a prototype.");
    }

    /**
     * Test of main method, of class CompileJS.
     */
    @Test
    public void testMain() throws Exception {
        System.out.println("main");
        String[] args = null;
        CompileJS.main(args);
        // TODO review the generated test code and remove the default call to fail.
        fail("The test case is a prototype.");
    }

    /**
     * Test of turnCSSToJS method, of class CompileJS.
     */
    @Test
    public void testTurnCSSToJS() {
        System.out.println("");
        String css = "* {color: red !important;} .colors{\ncolor: red;\n}\n.other {\n\n}\n";
        StringBuilder expResult = null;
        StringBuilder[] result = CompileJS.turnCSSToJS(css);
        System.out.println(result[0].append(result[1]));
    }

    /**
     * Test of mergeChunks method, of class CompileJS.
     */
    @Test
    public void testMergeChunks() {
        System.out.println("mergeChunks");
        Map<String, StringBuilder> to = null;
        Map<String, StringBuilder> from = null;
        CompileJS.mergeChunks(to, from);
        // TODO review the generated test code and remove the default call to fail.
        fail("The test case is a prototype.");
    }
    
}
