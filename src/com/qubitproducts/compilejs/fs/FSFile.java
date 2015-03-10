package com.qubitproducts.compilejs.fs;

import com.qubitproducts.compilejs.Cacheable;
import java.io.File;
import java.io.FileFilter;
import java.io.FilenameFilter;
import java.io.IOException;

/**
 *
 * @author Peter Fronc <peter.fronc@qubitdigital.com>
 */
public interface FSFile extends Cacheable {

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

  public File getFile();
  
  public String getAsString();
  
}



//
//
//
//package com.qubitproducts.opentag;
//
//import java.net.URI;
//
///**
// *
// * @author Peter Fronc <peter.fronc@qubitdigital.com>
// */
//
//
//import java.io.File;
//import java.io.FileFilter;
//import java.io.FilenameFilter;
//import java.io.IOException;
//
///**
// *
// * @author Peter Fronc <peter.fronc@qubitdigital.com>
// */
//abstract public class FSFile extends File {
//
//  public FSFile(String pathname) {
//    super(pathname);
//  }
//
//  public FSFile(File file) {
//    super(separator);
//  }
//
//  public FSFile(String parent, String child) {
//    super(parent, child);
//  }
//
//  public FSFile(FSFile parent, String child) {
//    super(parent, child);
//  }
//
//  public FSFile(URI uri) {
//    super(uri);
//  }
//    
//  @Override
//  public abstract boolean canExecute();
//
//  @Override
//  public abstract boolean canRead();
//
//  @Override
//  public abstract boolean canWrite();
//
//  public abstract int compareTo(FSFile pathname);
//
//  @Override
//  public abstract boolean createNewFile() throws IOException;
//
//  @Override
//  public abstract boolean delete();
//
//  @Override
//  public abstract void deleteOnExit();
//
//  @Override
//  public abstract boolean exists();
//
//  @Override
//  public abstract FSFile getAbsoluteFile();
//
//  @Override
//  public abstract String getAbsolutePath();
//
//  @Override
//  public abstract FSFile getCanonicalFile() throws IOException;
//
//  @Override
//  public abstract String getCanonicalPath() throws IOException;
//
//  @Override
//  public abstract long getFreeSpace();
//
//  @Override
//  public abstract String getName();
//
//  @Override
//  public abstract String getParent();
//
//  @Override
//  public abstract FSFile getParentFile();
//
//  @Override
//  public abstract String getPath();
//
//  @Override
//  public abstract long getTotalSpace();
//
//  @Override
//  public abstract long getUsableSpace();
//
//  @Override
//  public abstract boolean isAbsolute();
//
//  @Override
//  public abstract boolean isDirectory();
//
//  @Override
//  public abstract boolean isFile();
//
//  @Override
//  public abstract boolean isHidden();
//
//  @Override
//  public abstract long lastModified();
//
//  @Override
//  public abstract long length();
//
//  @Override
//  public abstract String[] list();
//
//  @Override
//  public abstract String[] list(FilenameFilter filter);
//
//  @Override
//  public abstract FSFile[] listFiles();
//
//  @Override
//  public abstract FSFile[] listFiles(FilenameFilter filter);
//
//  @Override
//  public abstract FSFile[] listFiles(FileFilter filter);
//
//  @Override
//  public abstract boolean mkdir();
//
//  @Override
//  public abstract boolean mkdirs();
//
//  public abstract boolean renameTo(FSFile dest);
//
//  @Override
//  public abstract boolean setExecutable(boolean executable, boolean ownerOnly);
//
//  @Override
//  public abstract boolean setExecutable(boolean executable);
//
//  @Override
//  public abstract boolean setLastModified(long time);
//
//  @Override
//  public abstract boolean setReadOnly();
//
//  @Override
//  public abstract boolean setReadable(boolean readable, boolean ownerOnly);
//
//  @Override
//  public abstract boolean setReadable(boolean readable);
//
//  @Override
//  public abstract boolean setWritable(boolean writable, boolean ownerOnly);
//
//  @Override
//  public abstract boolean setWritable(boolean writable);
//  
//}
