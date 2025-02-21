# Introduction
Web app used to view current and past solicitations, analyze spending
patterns, and research companies using open and public data sources.


## Quickstart
1. Download/compile/build the app (see maven quickstart)
2. Create config file
3. Load data
4. Create indexes


## Maven Quickstart
```shell
git clone https://github.com/kartographia/prospekt-server.git
cd prospekt-server
mvn install
java -jar dist/prospekt-server.jar -config ../config.json
```

## Config File

The server currently requires a config file to start. The config file contains
database connection information, API keys, local file paths, etc. Example:
```json
{

    "database": {
        "driver": "PostgreSQL",
        "host": "192.168.0.200:5432",
        "name": "prospekt",
        "username": "postgres",
        "password": "***************",
        "maxConnections": 35
    },

    "webserver" : {
        "port": 8080
    },

    "index": {
        "path" : "data/index"
    },

    "sources": {
        "sam.gov" : {
            "key" : "***************",
            "refreshRate" : 60
        },

        "usaspending.gov": {

            "database": {
                "driver": "PostgreSQL",
                "192.168.0.200:5432",
                "name": "usaspending_20250106",
                "username": "postgres",
                "password": "***************",
                "maxConnections": 35
            }
        }
    }
}
```


## Database Initialization

By default, the server will create a new database on startup. If you don't have
a database defined in your config file, or if you have explicitly defined an
H2 database in your config file, an H2 database will be created automatically.

If you are targeting a PostgreSQL database in your config file, it is highly
recommended that you create the database before you start the server. Example:

```shell
sudo mkdir -p /mnt/ssd/postgresql/prospekt
sudo chown postgres.postgres /mnt/ssd/postgresql/prospekt
sudo -i -u postgres psql -c "CREATE TABLESPACE prospekt LOCATION '/mnt/ssd/postgresql/prospekt';"
sudo -i -u postgres psql -c "create database prospekt tablespace prospekt;"
```


## Loading Data

- [USASpending.gov](https://github.com/kartographia/prospekt-server/wiki/USASpending.gov)
- [Sam.gov](https://github.com/kartographia/prospekt-server/wiki/SAM.gov)

## Create Index

Once data is loaded into the system, you can create text index like this:
```shell
java -jar prospekt-server.jar -config /path/to/config.json -update index
```