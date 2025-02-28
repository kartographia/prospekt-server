CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE ADDRESS (
    ID BIGSERIAL NOT NULL,
    STREET varchar,
    CITY varchar NOT NULL,
    STATE varchar,
    COUNTRY varchar NOT NULL DEFAULT 'US',
    POSTAL_CODE varchar,
    SEARCH_TERM varchar,
    LATITUDE numeric,
    LONGITUDE numeric,
    COORDINATES geometry(Geometry,4326),
    INFO jsonb,
    CONSTRAINT PK_ADDRESS PRIMARY KEY (ID)
);


CREATE TABLE COMPANY (
    ID BIGSERIAL NOT NULL,
    NAME varchar NOT NULL,
    DESCRIPTION varchar,
    UEI varchar,
    BUSINESS_TYPE varchar array,
    RECENT_AWARDS integer,
    RECENT_AWARD_VAL numeric,
    RECENT_AWARD_MIX numeric,
    RECENT_CUSTOMERS varchar array,
    RECENT_NAICS varchar array,
    ESTIMATED_REVENUE numeric,
    ESTIMATED_BACKLOG numeric,
    ESTIMATED_REVENUE2 numeric,
    ESTIMATED_REVENUE3 numeric,
    ESTIMATED_REVENUE4 numeric,
    LAST_UPDATE TIMESTAMP with time zone,
    LIKES bigint NOT NULL DEFAULT 0,
    TAGS varchar array,
    INFO jsonb,
    CONSTRAINT PK_COMPANY PRIMARY KEY (ID)
);


CREATE TABLE COMPANY_ADDRESS (
    ID BIGSERIAL NOT NULL,
    COMPANY_ID bigint NOT NULL,
    ADDRESS_ID bigint NOT NULL,
    TYPE varchar,
    DATE TIMESTAMP with time zone,
    INFO jsonb,
    CONSTRAINT PK_COMPANY_ADDRESS PRIMARY KEY (ID)
);


CREATE TABLE COMPANY_OFFICER (
    ID BIGSERIAL NOT NULL,
    PERSON_ID bigint NOT NULL,
    COMPANY_ID bigint NOT NULL,
    TITLE varchar,
    SALARY numeric,
    LAST_UPDATE TIMESTAMP with time zone,
    INFO jsonb,
    CONSTRAINT PK_COMPANY_OFFICER PRIMARY KEY (ID)
);


CREATE TABLE COMPANY_GROUP (
    ID BIGSERIAL NOT NULL,
    NAME varchar,
    DESCRIPTION varchar,
    INFO jsonb,
    CONSTRAINT PK_COMPANY_GROUP PRIMARY KEY (ID)
);


CREATE TABLE COMPANY_GROUP_ACCESS (
    ID BIGSERIAL NOT NULL,
    COMPANY_GROUP_ID bigint NOT NULL,
    USER_ID bigint NOT NULL,
    ACCESS_LEVEL integer NOT NULL,
    CONSTRAINT PK_COMPANY_GROUP_ACCESS PRIMARY KEY (ID)
);


CREATE TABLE PERSON (
    ID BIGSERIAL NOT NULL,
    FIRST_NAME varchar,
    LAST_NAME varchar,
    FULL_NAME varchar,
    SEARCH_TERM varchar,
    CONTACT jsonb,
    INFO jsonb,
    CONSTRAINT PK_PERSON PRIMARY KEY (ID)
);


CREATE TABLE PERSON_ADDRESS (
    ID BIGSERIAL NOT NULL,
    PERSON_ID bigint NOT NULL,
    ADDRESS_ID bigint NOT NULL,
    TYPE varchar,
    INFO jsonb,
    CONSTRAINT PK_PERSON_ADDRESS PRIMARY KEY (ID)
);


CREATE TABLE SOURCE (
    ID BIGSERIAL NOT NULL,
    NAME varchar NOT NULL UNIQUE,
    DESCRIPTION varchar,
    INFO jsonb,
    CONSTRAINT PK_SOURCE PRIMARY KEY (ID)
);


CREATE TABLE OPPORTUNITY (
    ID BIGSERIAL NOT NULL,
    NAME varchar NOT NULL,
    DESCRIPTION varchar,
    ORGANIZATION varchar,
    ANNOUNCEMENT varchar,
    NAICS varchar,
    SET_ASIDE varchar,
    CLASSIFICATION varchar,
    POSTED_DATE TIMESTAMP with time zone,
    RESPONSE_DATE TIMESTAMP with time zone,
    START_DATE TIMESTAMP with time zone,
    CONTRACT_TYPE varchar,
    CONTRACT_VALUE bigint,
    CONTRACT_START TIMESTAMP with time zone,
    SOURCE_ID bigint NOT NULL,
    SOURCE_KEY varchar,
    ACTIVE boolean,
    INFO jsonb,
    CONSTRAINT PK_OPPORTUNITY PRIMARY KEY (ID)
);


CREATE TABLE AWARD (
    ID BIGSERIAL NOT NULL,
    NAME varchar NOT NULL,
    DESCRIPTION varchar,
    DATE TIMESTAMP with time zone,
    TYPE varchar,
    VALUE numeric,
    FUNDED numeric,
    EXTENDED_VALUE numeric,
    NAICS varchar,
    CUSTOMER varchar,
    OFFICE varchar,
    START_DATE TIMESTAMP with time zone,
    END_DATE TIMESTAMP with time zone,
    EXTENDED_DATE TIMESTAMP with time zone,
    COMPETED boolean NOT NULL DEFAULT false,
    NUM_BIDS integer,
    SET_ASIDE varchar,
    OPPORTUNITY_ID bigint,
    RECIPIENT_ID bigint,
    SOURCE_ID bigint NOT NULL,
    SOURCE_KEY varchar NOT NULL,
    INFO jsonb,
    CONSTRAINT PK_AWARD PRIMARY KEY (ID)
);


CREATE TABLE CODE (
    ID BIGSERIAL NOT NULL,
    KEY varchar NOT NULL,
    VALUE varchar NOT NULL,
    CATEGORY varchar NOT NULL,
    COMMENTS varchar,
    SOURCE_ID bigint NOT NULL,
    CONSTRAINT PK_CODE PRIMARY KEY (ID)
);


CREATE TABLE "user" (
    ID BIGSERIAL NOT NULL,
    PERSON_ID bigint NOT NULL UNIQUE,
    STATUS integer NOT NULL DEFAULT 1,
    ACCESS_LEVEL integer NOT NULL,
    INFO jsonb,
    CONSTRAINT PK_USER PRIMARY KEY (ID)
);


CREATE TABLE USER_AUTHENTICATION (
    ID BIGSERIAL NOT NULL,
    SERVICE varchar NOT NULL,
    KEY varchar NOT NULL,
    VALUE varchar,
    USER_ID bigint NOT NULL,
    INFO jsonb,
    CONSTRAINT PK_USER_AUTHENTICATION PRIMARY KEY (ID)
);


CREATE TABLE USER_PREFERENCE (
    ID BIGSERIAL NOT NULL,
    KEY VARCHAR(50) NOT NULL,
    VALUE varchar NOT NULL,
    USER_ID bigint NOT NULL,
    CONSTRAINT PK_USER_PREFERENCE PRIMARY KEY (ID)
);


CREATE TABLE USER_INTEREST (
    ID BIGSERIAL NOT NULL,
    USER_ID bigint NOT NULL,
    OPPORTUNITY_ID bigint NOT NULL,
    INTEREST boolean NOT NULL,
    INFO jsonb,
    CONSTRAINT PK_USER_INTEREST PRIMARY KEY (ID)
);


CREATE TABLE USER_ACTIVITY (
    ID BIGSERIAL NOT NULL,
    USER_ID bigint NOT NULL,
    HOUR integer NOT NULL,
    MINUTE integer NOT NULL,
    COUNT integer NOT NULL,
    CONSTRAINT PK_USER_ACTIVITY PRIMARY KEY (ID)
);


CREATE TABLE COMPANY_GROUP_COMPANY (
    COMPANY_GROUP_ID BIGINT NOT NULL,
    COMPANY_ID BIGINT NOT NULL,
    CONSTRAINT FK_COMPANY_GROUP_COMPANY FOREIGN KEY (COMPANY_GROUP_ID) REFERENCES COMPANY_GROUP(ID)
        ON DELETE CASCADE ON UPDATE NO ACTION
);

ALTER TABLE COMPANY_GROUP_COMPANY ADD FOREIGN KEY (COMPANY_ID) REFERENCES COMPANY(ID)
    ON DELETE CASCADE ON UPDATE NO ACTION;

CREATE INDEX IDX_COMPANY_GROUP_COMPANY_COMPANY_GROUP_ID ON COMPANY_GROUP_COMPANY(COMPANY_GROUP_ID);
CREATE INDEX IDX_COMPANY_GROUP_COMPANY_COMPANY_ID ON COMPANY_GROUP_COMPANY(COMPANY_ID);



ALTER TABLE COMPANY_ADDRESS ADD FOREIGN KEY (COMPANY_ID) REFERENCES COMPANY(ID)
    ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE COMPANY_ADDRESS ADD FOREIGN KEY (ADDRESS_ID) REFERENCES ADDRESS(ID)
    ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE COMPANY_OFFICER ADD FOREIGN KEY (PERSON_ID) REFERENCES PERSON(ID)
    ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE COMPANY_OFFICER ADD FOREIGN KEY (COMPANY_ID) REFERENCES COMPANY(ID)
    ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE COMPANY_GROUP_ACCESS ADD FOREIGN KEY (COMPANY_GROUP_ID) REFERENCES COMPANY_GROUP(ID)
    ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE COMPANY_GROUP_ACCESS ADD FOREIGN KEY (USER_ID) REFERENCES "user"(ID)
    ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE PERSON_ADDRESS ADD FOREIGN KEY (PERSON_ID) REFERENCES PERSON(ID)
    ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE PERSON_ADDRESS ADD FOREIGN KEY (ADDRESS_ID) REFERENCES ADDRESS(ID)
    ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE OPPORTUNITY ADD FOREIGN KEY (SOURCE_ID) REFERENCES SOURCE(ID)
    ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE AWARD ADD FOREIGN KEY (OPPORTUNITY_ID) REFERENCES OPPORTUNITY(ID)
    ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE AWARD ADD FOREIGN KEY (RECIPIENT_ID) REFERENCES COMPANY(ID)
    ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE AWARD ADD FOREIGN KEY (SOURCE_ID) REFERENCES SOURCE(ID)
    ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE CODE ADD FOREIGN KEY (SOURCE_ID) REFERENCES SOURCE(ID)
    ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "user" ADD FOREIGN KEY (PERSON_ID) REFERENCES PERSON(ID)
    ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE USER_AUTHENTICATION ADD FOREIGN KEY (USER_ID) REFERENCES "user"(ID)
    ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE USER_PREFERENCE ADD FOREIGN KEY (USER_ID) REFERENCES "user"(ID)
    ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE USER_INTEREST ADD FOREIGN KEY (USER_ID) REFERENCES "user"(ID)
    ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE USER_INTEREST ADD FOREIGN KEY (OPPORTUNITY_ID) REFERENCES OPPORTUNITY(ID)
    ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE USER_ACTIVITY ADD FOREIGN KEY (USER_ID) REFERENCES "user"(ID)
    ON DELETE NO ACTION ON UPDATE NO ACTION;


CREATE INDEX IDX_ADDRESS_COORDINATES ON ADDRESS USING GIST(COORDINATES);
CREATE INDEX IDX_COMPANY_ADDRESS_COMPANY ON COMPANY_ADDRESS(COMPANY_ID);
CREATE INDEX IDX_COMPANY_ADDRESS_ADDRESS ON COMPANY_ADDRESS(ADDRESS_ID);
CREATE INDEX IDX_COMPANY_OFFICER_PERSON ON COMPANY_OFFICER(PERSON_ID);
CREATE INDEX IDX_COMPANY_OFFICER_COMPANY ON COMPANY_OFFICER(COMPANY_ID);
CREATE INDEX IDX_COMPANY_GROUP_ACCESS_COMPANY_GROUP ON COMPANY_GROUP_ACCESS(COMPANY_GROUP_ID);
CREATE INDEX IDX_COMPANY_GROUP_ACCESS_USER ON COMPANY_GROUP_ACCESS(USER_ID);
CREATE INDEX IDX_PERSON_ADDRESS_PERSON ON PERSON_ADDRESS(PERSON_ID);
CREATE INDEX IDX_PERSON_ADDRESS_ADDRESS ON PERSON_ADDRESS(ADDRESS_ID);
CREATE INDEX IDX_OPPORTUNITY_SOURCE ON OPPORTUNITY(SOURCE_ID);
CREATE INDEX IDX_AWARD_OPPORTUNITY ON AWARD(OPPORTUNITY_ID);
CREATE INDEX IDX_AWARD_COMPANY ON AWARD(RECIPIENT_ID);
CREATE INDEX IDX_AWARD_SOURCE ON AWARD(SOURCE_ID);
CREATE INDEX IDX_CODE_SOURCE ON CODE(SOURCE_ID);
CREATE INDEX IDX_USER_PERSON ON "user"(PERSON_ID);
CREATE INDEX IDX_USER_AUTHENTICATION_USER ON USER_AUTHENTICATION(USER_ID);
CREATE INDEX IDX_USER_PREFERENCE_USER ON USER_PREFERENCE(USER_ID);
CREATE INDEX IDX_USER_INTEREST_USER ON USER_INTEREST(USER_ID);
CREATE INDEX IDX_USER_INTEREST_OPPORTUNITY ON USER_INTEREST(OPPORTUNITY_ID);
CREATE INDEX IDX_USER_ACTIVITY_USER ON USER_ACTIVITY(USER_ID);


-- Updates
CREATE INDEX IDX_COMPANY_UEI ON COMPANY(UEI);
CREATE INDEX IDX_COMPANY_BUSINESS_TYPE ON COMPANY USING GIN (BUSINESS_TYPE);
CREATE INDEX IDX_COMPANY_AWARDS ON COMPANY(RECENT_AWARD_VAL);
CREATE INDEX IDX_COMPANY_REVENUE ON COMPANY(ESTIMATED_REVENUE);
CREATE INDEX IDX_COMPANY_LIKES ON COMPANY(LIKES);
CREATE INDEX IDX_COMPANY_TAGS ON COMPANY USING GIN (TAGS);
--CREATE INDEX IDX_COMPANY_NAICS ON COMPANY(RECENT_NAICS);
--CREATE INDEX IDX_COMPANY_CUSTOMERS ON COMPANY(RECENT_CUSTOMERS);
CREATE INDEX IDX_COMPANY_NAICS ON COMPANY USING GIN (RECENT_NAICS);
CREATE INDEX IDX_COMPANY_CUSTOMERS ON COMPANY USING GIN (RECENT_CUSTOMERS);

CREATE INDEX IDX_PERSON_SEARCH_TERM ON PERSON(SEARCH_TERM);
CREATE INDEX IDX_ADDRESS_SEARCH_TERM ON ADDRESS(SEARCH_TERM);

CREATE INDEX IDX_AWARD_CUSTOMER ON AWARD(CUSTOMER);
CREATE INDEX IDX_AWARD_SAVE_QRY ON AWARD(RECIPIENT_ID, SOURCE_ID, SOURCE_KEY);

CREATE INDEX IDX_AWARD_VALUE ON AWARD(VALUE);
CREATE INDEX IDX_AWARD_FUNDED ON AWARD(FUNDED);
CREATE INDEX IDX_AWARD_EXTENDED_VALUE ON AWARD(EXTENDED_VALUE);

CREATE UNIQUE INDEX IDX_USER_ACTIVITY on USER_ACTIVITY(USER_ID, HOUR, MINUTE);
CREATE UNIQUE INDEX IDX_COMPANY_GROUP_ACCESS on COMPANY_GROUP_ACCESS(USER_ID, COMPANY_GROUP_ID);