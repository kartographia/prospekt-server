-- Returns distinct UEIs from the "distinct_uei" table created using the following command:

--create table distinct_uei as select distinct(awardee_or_recipient_uei) as uei
--from raw.source_procurement_transaction;

select uei from distinct_uei;