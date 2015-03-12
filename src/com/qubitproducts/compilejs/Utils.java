package com.qubitproducts.compilejs;

import static com.qubitproducts.compilejs.MainProcessor.FSLASH;

/**
 *
 * @author Peter Fronc <peter.fronc@qubitdigital.com>
 */
public class Utils {
    static public boolean classPathElementChar(char ch) {
    return (ch >= 'A' && ch <= 'Z') ||
          (ch >= 'a' && ch <= 'z') ||
          (ch >= '0' && ch <= '9') ||
          ch == '_';
  }

    static public boolean isClasspath(String string) {
        if (string == null || string.length() == 0) {
            return false;
        }

        if (string.charAt(0) == '.') {
            return false;
        }
        
        if (string.charAt(string.length() - 1) == '.') {
            return false;
        }

        if (!classPathElementChar(string.charAt(0))
            || (string.charAt(0) == '_')) {
            return false;
        }

        boolean wasDot = false;

        for (int i = 1; i < string.length(); i++) {
            char ch = string.charAt(0);
            if (!classPathElementChar(ch)) {
                return false;
            }
            if (ch == '.') {
                if (wasDot) {
                    return false;
                } else {
                    wasDot = true;
                }
            } else if (wasDot) {
                wasDot = false;
            }
        }
        return true;
    }
  
  static public String translateClasspathToPath(String path) {
    int len = path.length();
    StringBuilder sb = new StringBuilder();
    int curr = 0;
    boolean prevDot = false;
    boolean oneDotUSed = false;
    char lastChar = 0;
    for (int i = 0; i < len; i++) {
      char ch = path.charAt(i);
      boolean acceptable = classPathElementChar(ch) || ch == '*';
      if (acceptable) {
        if (prevDot) {
          if (curr > 0) {
            if (!oneDotUSed && lastChar == '#') {
              oneDotUSed = true;
              sb.append(".");
            } else sb.append(FSLASH);
            curr++;
          }
          prevDot = false;
        }
        
        sb.append(ch);
        curr++;
      } else {
        prevDot = true;
      }
      lastChar = ch;
    }
    
    return sb.toString();
  }
}
