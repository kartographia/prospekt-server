package com.kartographia.prospekt.utils;

import java.util.*;
import java.util.concurrent.atomic.AtomicLong;
import javaxt.express.utils.StatusLogger;
import javaxt.sql.*;
import static javaxt.utils.Console.console;

import org.apache.lucene.index.IndexWriter;

public class Maintenance {

    public static void updateCompanyIndex(LuceneIndex index, Database database)
        throws Exception {


        AtomicLong recordCounter = new AtomicLong(0);
        StatusLogger statusLogger = new StatusLogger(recordCounter);
        long startTime = System.currentTimeMillis();


        IndexWriter writer = index.getWriter();

        try(Connection conn = database.getConnection()){
            for (Record record : conn.getRecords(
            "select id, uei, name from company")){

                var r = new javaxt.utils.Record();
                r.set("id", record.get("id"));

                r.set("name", record.get("name"));
                index.addRecord(r, writer);

                r.set("name", record.get("uei"));
                index.addRecord(r, writer);

                recordCounter.incrementAndGet();
            }
        }

        writer.commit();

        statusLogger.shutdown();
    }

}