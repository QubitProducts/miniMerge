/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
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
