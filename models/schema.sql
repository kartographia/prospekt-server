
CREATE TABLE CONTACT (
    ID BIGSERIAL NOT NULL,
    FIRST_NAME text,
    LAST_NAME text,
    FULL_NAME text,
    GENDER text,
    DOB text,
    INFO jsonb,
    CONSTRAINT PK_CONTACT PRIMARY KEY (ID)
);


CREATE TABLE "user" (
    ID BIGSERIAL NOT NULL,
    USERNAME VARCHAR(255) NOT NULL UNIQUE,
    PASSWORD text NOT NULL,
    ACCESS_LEVEL integer NOT NULL,
    ACTIVE boolean NOT NULL DEFAULT true,
    CONTACT_ID bigint,
    AUTH jsonb,
    INFO jsonb,
    CONSTRAINT PK_USER PRIMARY KEY (ID)
);


CREATE TABLE USER_PREFERENCE (
    ID BIGSERIAL NOT NULL,
    KEY VARCHAR(50) NOT NULL,
    VALUE text NOT NULL,
    USER_ID bigint NOT NULL,
    CONSTRAINT PK_USER_PREFERENCE PRIMARY KEY (ID)
);


CREATE TABLE SOURCE (
    ID BIGSERIAL NOT NULL,
    NAME text NOT NULL,
    DESCRIPTION text,
    INFO jsonb,
    CONSTRAINT PK_SOURCE PRIMARY KEY (ID)
);


CREATE TABLE OPPORTUNITY (
    ID BIGSERIAL NOT NULL,
    NAME text NOT NULL,
    DESCRIPTION text,
    ORGANIZATION text,
    TYPE text,
    NAICS text,
    SET_ASIDE text,
    CLASSIFICATION text,
    POSTED_DATE TIMESTAMP with time zone,
    REPONSE_DATE TIMESTAMP with time zone,
    START_DATE TIMESTAMP with time zone,
    VALUE bigint,
    SOURCE_ID bigint NOT NULL,
    SOURCE_KEY text,
    ACTIVE boolean,
    INFO jsonb,
    CONSTRAINT PK_OPPORTUNITY PRIMARY KEY (ID)
);


CREATE TABLE TAG (
    ID BIGSERIAL NOT NULL,
    USER_ID bigint NOT NULL,
    OPPORTUNITY_ID bigint NOT NULL,
    INTEREST boolean NOT NULL,
    INFO jsonb,
    CONSTRAINT PK_TAG PRIMARY KEY (ID)
);



ALTER TABLE "user" ADD FOREIGN KEY (CONTACT_ID) REFERENCES CONTACT(ID)
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE USER_PREFERENCE ADD FOREIGN KEY (USER_ID) REFERENCES "user"(ID)
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE OPPORTUNITY ADD FOREIGN KEY (SOURCE_ID) REFERENCES SOURCE(ID)
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE TAG ADD FOREIGN KEY (USER_ID) REFERENCES "user"(ID)
    ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE TAG ADD FOREIGN KEY (OPPORTUNITY_ID) REFERENCES OPPORTUNITY(ID)
    ON DELETE CASCADE ON UPDATE NO ACTION;



CREATE INDEX IDX_USER_CONTACT ON "user"(CONTACT_ID);
CREATE INDEX IDX_USER_PREFERENCE_USER ON USER_PREFERENCE(USER_ID);
CREATE INDEX IDX_OPPORTUNITY_SOURCE ON OPPORTUNITY(SOURCE_ID);
CREATE INDEX IDX_TAG_USER ON TAG(USER_ID);
CREATE INDEX IDX_TAG_OPPORTUNITY ON TAG(OPPORTUNITY_ID);
