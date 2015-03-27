package com.qubitproducts.compilejs.fs;

import com.qubitproducts.compilejs.Cacheable;
import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.File;
import java.io.FileFilter;
import java.io.FileNotFoundException;
import java.io.FilenameFilter;
import java.io.IOException;
import java.util.List;
import java.util.Map;

/**
 *
 * @author Peter Fronc <peter.fronc@qubitdigital.com>
 */
public interface FSFile extends Cacheable {

  public static String separator = File.separator;

  public static char separatorChar = File.separatorChar;

  public boolean canExecute();

  public boolean canRead();

  public boolean canWrite();

  public int compareTo(FSFile pathname);

  public boolean createNewFile() throws IOException;

  public boolean delete();

  public void deleteOnExit();

  public boolean exists();

  public FSFile getAbsoluteFile();

  public String getAbsolutePath();

  public FSFile getCanonicalFile() throws IOException;

  public String getCanonicalPath() throws IOException;

  public long getFreeSpace();

  public String getName();

  public String getParent();

  public FSFile getParentFile();

  public String getPath();

  public long getTotalSpace();

  public long getUsableSpace();

  public boolean isAbsolute();

  public boolean isDirectory();

  public boolean isFile();

  public boolean isHidden();

  public long lastModified();

  public long length();

  public String[] list();

  public String[] list(FilenameFilter filter);

  public FSFile[] listFiles();

  public FSFile[] listFiles(FilenameFilter filter);

  public FSFile[] listFiles(FileFilter filter);

  public boolean mkdir();

  public boolean mkdirs();

  public boolean renameTo(FSFile dest);

  public boolean setExecutable(boolean executable, boolean ownerOnly);

  public boolean setExecutable(boolean executable);

  public boolean setLastModified(long time);

  public boolean setReadOnly();

  public boolean setReadable(boolean readable, boolean ownerOnly);

  public boolean setReadable(boolean readable);

  public boolean setWritable(boolean writable, boolean ownerOnly);

  public boolean setWritable(boolean writable);

  public String getAsString();

  public FSFile getChild(FSFile location);

  public FSFile getChild(String BUILD_DIR);

  public List<String> getLines() throws IOException;
  public List<String> saveLines(List<String> lines) throws IOException;
  
  public LineReader getLineReader(Map<String, List<String>> cache) throws IOException;
  
  public BufferedWriter getBufferedWriter() throws IOException;

  public BufferedWriter getBufferedWriter(boolean b) throws IOException;

  public BufferedReader getBufferedReader() throws FileNotFoundException;
  
}
