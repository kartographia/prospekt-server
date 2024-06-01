# Introduction
Web app used to view current and past solicitations and analyze spending
patterns by organization using open and public data sources.


## Quickstart
1. Download/compile/build the app (see maven quickstart)
2. Create config file
3. Load data


## Maven Quickstart
```
git clone https://github.com/kartographia/prospekt-server.git
cd prospekt-server
mvn install
java -jar dist/kartographia-prospekt-server.jar -config ../config.json
```


## Database Initialization

By default, the server will create a new database on startup. If you don't have
a database defined in your config file, or if you have explicitly defined an
H2 database in your config file, an H2 database will be created automatically.

If you are targeting a PostgreSQL database in your config file, it is highly
recommended that you create the database before you start the server. Example:

```
sudo mkdir -p /mnt/ssd/postgresql/prospekt
sudo chown postgres.postgres /mnt/ssd/postgresql/prospekt
sudo -i -u postgres psql -c "CREATE TABLESPACE prospekt LOCATION '/mnt/ssd/postgresql/prospekt';"
sudo -i -u postgres psql -c "create database prospekt tablespace prospekt;"
```


## Loading Data

- USASpending.gov
- Sam.gov
