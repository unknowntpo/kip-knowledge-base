package dev.ossknowledgebase;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.apache.flink.table.factories.CatalogFactory;
import org.apache.flink.table.factories.Factory;
import org.apache.flink.table.factories.FactoryUtil;
import org.junit.jupiter.api.Test;

class FlussFlinkCompatibilityTest {
    @Test
    void pinnedConnectorIsDiscoverableByFlink() {
        ClassLoader classLoader = Thread.currentThread().getContextClassLoader();
        Factory factory = FactoryUtil.discoverFactory(classLoader, CatalogFactory.class, "fluss");

        assertEquals("fluss", factory.factoryIdentifier());
        assertEquals("org.apache.fluss.flink.catalog.FlinkCatalogFactory", factory.getClass().getName());
    }

    @Test
    void connectorLoadsOnTheJava17BaselineOrNewer() {
        assertTrue(Runtime.version().feature() >= 17);
    }
}
