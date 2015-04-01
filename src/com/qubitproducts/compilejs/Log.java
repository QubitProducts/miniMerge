/*
 *  Copyright  @ QubitProducts.com
 *
 *  CompileJS is free software: you can redistribute it and/or modify
 *  it under the terms of the Lesser GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  CompileJS is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  Lesser GNU General Public License for more details.
 *
 *  You should have received a copy of the Lesser GNU General Public License.
 *  If not, see LGPL licence at http://www.gnu.org/licenses/lgpl-3.0.html.
 */
package com.qubitproducts.compilejs;

import java.util.logging.Logger;

/**
 *
 * @author piotr
 */
public class Log {
  /**
   * Log levels, Deafault and fine are {System.out.println} based. FINE is java
   * logger at FINE level.
   */
  static public enum LogLevel {
    CONSOLE,
    NONE,
    FINE,
    DEFAULT
  }
  
  private static final Logger LOGGER
      = Logger.getLogger(MainProcessor.class.getName());
  
  static public void setLevel(LogLevel level) {
    LOG_LEVEL = level;
    LOG = isLog();
  }
  
  static private LogLevel LOG_LEVEL = LogLevel.CONSOLE;
  
  public static boolean LOG = isLog();
  
  public static boolean isLog() {
    //return false;
    return LOG_LEVEL != LogLevel.NONE;
  }
  //@todo refactor this.
  public static void log(String msg) {
    switch (LOG_LEVEL) {
      case CONSOLE:
        System.out.println(msg);
        break;
      case NONE:
        break;
      case FINE:
        LOGGER.fine(msg);
        break;
      default:
        LOGGER.info(msg);
    }
  }
    
  public static void severe(String msg) {
    if (LOG_LEVEL != LogLevel.NONE) {
      LOGGER.severe(msg);
    }
  }
}
