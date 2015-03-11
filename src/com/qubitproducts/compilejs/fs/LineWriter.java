package com.qubitproducts.compilejs.fs;

import java.io.IOException;

/**
 *
 * @author piotr
 */
public interface LineWriter {
  public void getLines();
  public void flush() throws IOException;
  public void close() throws IOException;
}
