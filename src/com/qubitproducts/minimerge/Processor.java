
package com.qubitproducts.minimerge;

import java.util.List;

/**
 *
 * @author piotr
 */
public interface Processor {
    public void process(List<Object[]> chunks);
}
