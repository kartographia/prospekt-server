var package = "com.kartographia.prospekt.model";
var models = {

  //**************************************************************************
  //** Address
  //**************************************************************************
    Address: {
        fields: [
            {name: 'street',        type: 'string'},
            {name: 'city',          type: 'string'},
            {name: 'state',         type: 'string'},
            {name: 'country',       type: 'string'},
            {name: 'postalCode',    type: 'string'},
            {name: 'searchTerm',    type: 'string'},
            {name: 'latitude',      type: 'decimal'},
            {name: 'longitude',     type: 'decimal'},
            {name: 'coordinates',   type: 'geo'},
            {name: 'info',          type: 'json'}
        ],
        constraints: [
            {name: 'street',        required: false},
            {name: 'city',          required: true},
            {name: 'state',         required: false},
            {name: 'country',       required: true}
        ],
        defaults: [
            {name: 'country',       value: 'US'}
        ]
    },


  //**************************************************************************
  //** Company
  //**************************************************************************
  /** Used to represent an individual company
   */
    Company: {
        fields: [
            {name: 'name',              type: 'string'},
            {name: 'description',       type: 'string'},
            {name: 'uei',               type: 'string'},
            {name: 'recent_awards',     type: 'int'},      //total awards in the last 12 months
            {name: 'recent_award_val',  type: 'decimal'},  //total value of awards in the last 12 months
            {name: 'recent_award_mix',  type: 'decimal'},  //percent competative awards in the last 12 months
            {name: 'recent_customers',  type: 'string[]'}, //awarding agencies in the last 12 months
            {name: 'recent_naics',      type: 'string[]'}, //naics codes associated with recent awards
            {name: 'estimated_revenue', type: 'decimal'},
            {name: 'estimated_backlog', type: 'decimal'},
            {name: 'lastUpdate',        type: 'date'},
            {name: 'info',              type: 'json'}
        ],
        constraints: [
            {name: 'name',  required: true}
        ]
    },


  //**************************************************************************
  //** CompanyAddress
  //**************************************************************************
  /** Used to represent an address for an individual company
   */
    CompanyAddress: {
        fields: [
            {name: 'company',   type: 'Company'},
            {name: 'address',   type: 'Address'},
            {name: 'type',      type: 'string'},
            {name: 'date',      type: 'date'},
            {name: 'info',      type: 'json'}
        ],
        constraints: [
            {name: 'company',   required: true},
            {name: 'address',   required: true},
            {name: 'salary',    required: true}
        ]
    },


  //**************************************************************************
  //** CompanyOfficer
  //**************************************************************************
  /** Used to represent an individual company officer
   */
    CompanyOfficer: {
        fields: [
            {name: 'person',        type: 'Person'},
            {name: 'company',       type: 'Company'},
            {name: 'title',         type: 'string'},
            {name: 'salary',        type: 'decimal'},
            {name: 'lastUpdate',    type: 'date'},
            {name: 'info',          type: 'json'}
        ],
        constraints: [
            {name: 'person',        required: true},
            {name: 'company',       required: true}
        ]
    },


  //**************************************************************************
  //** CompanyGroup
  //**************************************************************************
  /** Used to represent a group of companies
   */
    CompanyGroup: {
        fields: [
            {name: 'name',          type: 'string'},
            {name: 'description',   type: 'string'},
            {name: 'info',          type: 'json'}
        ],
        hasMany: [
            {model: 'Company',      name: 'companies'}
        ],
        constraints: [
            {name: 'companies',     required: true}
        ]
    },


  //**************************************************************************
  //** Person
  //**************************************************************************
  /** Used to represent an individual person
   */
    Person: {
        fields: [
            {name: 'firstName',     type: 'string'},
            {name: 'lastName',      type: 'string'},
            {name: 'fullName',      type: 'string'},
            {name: 'searchTerm',    type: 'string'},
            {name: 'contact',       type: 'json'},
            {name: 'info',          type: 'json'}
        ]
    },


  //**************************************************************************
  //** PersonAddress
  //**************************************************************************
  /** Used to represent an address for an individual person
   */
    PersonAddress: {
        fields: [
            {name: 'person',    type: 'Person'},
            {name: 'address',   type: 'Address'},
            {name: 'type',      type: 'string'}, //work, home, etc
            {name: 'info',      type: 'json'}
        ],
        constraints: [
            {name: 'person',    required: true},
            {name: 'address',   required: true}
        ]
    },


  //**************************************************************************
  //** Source
  //**************************************************************************
    Source: {
        fields: [
            {name: 'name',         type: 'string'},
            {name: 'description',  type: 'string'},
            {name: 'info',         type: 'json'}
        ],
        constraints: [
            {name: 'name',       required: true,  unique: true}
        ]
    },


  //**************************************************************************
  //** Opportunity
  //**************************************************************************
  /** Used to represent a solicitation. The source should be unique:
   *  CREATE UNIQUE INDEX IDX_OPPORTUNITY on OPPORTUNITY(SOURCE_ID, SOURCE_KEY);
   */
    Opportunity: {
        fields: [
            {name: 'name',              type: 'string'},
            {name: 'description',       type: 'string'},
            {name: 'organization',      type: 'string'}, //fullParentPathName
            {name: 'announcement',      type: 'string'}, //RFI, RFP, etc
            {name: 'naics',             type: 'string'},
            {name: 'setAside',          type: 'string'},
            {name: 'classification',    type: 'string'},
            {name: 'postedDate',        type: 'date'},
            {name: 'responseDate',      type: 'date'}, //reponseDeadLine
            {name: 'startDate',         type: 'date'},
            {name: 'contractType',      type: 'string'}, //FFP, T&M, IDIQ, etc
            {name: 'contractValue',     type: 'long'},
            {name: 'contractStart',     type: 'date'},
            {name: 'source',            type: 'Source'}, //sam.gov
            {name: 'sourceKey',         type: 'string'}, //solicitationNumber
            {name: 'active',            type: 'boolean'},
            {name: 'info',              type: 'json'}
        ],
        constraints: [
            {name: 'name',          required: true},
            {name: 'source',        required: true}
        ]
    },


  //**************************************************************************
  //** Award
  //**************************************************************************
  /** Used to represent an award. The source should be unique:
   *  CREATE UNIQUE INDEX IDX_AWARD on AWARD(SOURCE_ID, SOURCE_KEY);
   */
    Award: {
        fields: [
            {name: 'name',              type: 'string'},
            {name: 'description',       type: 'string'},
            {name: 'date',              type: 'date'}, //Award date
            {name: 'type',              type: 'string'}, //FFP, T&M, IDIQ, etc
            {name: 'value',             type: 'decimal'}, //total awarded
            {name: 'funded',            type: 'decimal'}, //total funded
            {name: 'extendedValue',     type: 'decimal'}, //potential value
            {name: 'naics',             type: 'string'},
            {name: 'customer',          type: 'string'}, //DOD
            {name: 'office',            type: 'string'}, //DEFENSE SECURITY COOPERATION AGENCY
            {name: 'startDate',         type: 'date'},
            {name: 'endDate',           type: 'date'}, //current end date
            {name: 'extendedDate',      type: 'date'}, //potential end date
            {name: 'competed',          type: 'boolean'},
            {name: 'opportunity',       type: 'Opportunity'}, //link to an opportunity
            {name: 'recipient',         type: 'Company'}, //link to a company
            {name: 'source',            type: 'Source'}, //usaspending.gov
            {name: 'sourceKey',         type: 'string'}, //unique_award_key or piid
            {name: 'info',              type: 'json'}
        ],
        constraints: [
            {name: 'name',          required: true},
            {name: 'competed',      required: true},
            {name: 'source',        required: true},
            {name: 'sourceKey',     required: true}
        ],
        defaults: [
            {name: 'competed',      value: false}
        ]
    },


  //**************************************************************************
  //** Code
  //**************************************************************************
  /** Used to represent a look up value
   *  CREATE UNIQUE INDEX IDX_CODE on CODE(KEY, CATEGORY, SOURCE_ID);
   */
    Code: {
        fields: [
            {name: 'key',           type: 'string'},
            {name: 'value',         type: 'string'},
            {name: 'category',      type: 'string'},
            {name: 'comments',      type: 'string'},
            {name: 'source',        type: 'Source'} //usaspending.gov
        ],
        constraints: [
            {name: 'key',       required: true},
            {name: 'value',     required: true},
            {name: 'category',  required: true},
            {name: 'source',    required: true}
        ]
    },


  //**************************************************************************
  //** User
  //**************************************************************************
  /** Used to represent an individual user.
   */
    User: {
        implements: ['java.security.Principal', 'javaxt.express.User'],
        fields: [
            {name: 'person',        type: 'Person'},
            {name: 'status',        type: 'int'},
            {name: 'accessLevel',   type: 'int'},
            {name: 'info',          type: 'json'}
        ],
        constraints: [
            {name: 'person',        required: true,     unique: true},
            {name: 'status',        required: true},
            {name: 'accessLevel',   required: true}
        ],
        defaults: [
            {name: 'status',    value: 1},
            {name: 'level',     value: 3}
        ]
    },


  //**************************************************************************
  //** UserAuthentication
  //**************************************************************************
  /** Used to encapsulate authentication information associated with an
   *  individual user. The authentication service and key should be unique:
   *  ALTER TABLE USER_AUTHENTICATION ADD UNIQUE (SERVICE, KEY);
   */
    UserAuthentication: {
        fields: [
            {name: 'service',     type: 'string'},
            {name: 'key',         type: 'string'},
            {name: 'value',       type: 'string'},
            {name: 'user',        type: 'User'},
            {name: 'info',        type: 'json'}
        ],
        constraints: [
            {name: 'service',   required: true},
            {name: 'key',       required: true},
            {name: 'user',      required: true}
        ]
    },


  //**************************************************************************
  //** UserPreference
  //**************************************************************************
    UserPreference: {
        fields: [
            {name: 'key',         type: 'string'},
            {name: 'value',       type: 'string'},
            {name: 'user',        type: 'User'}
        ],
        constraints: [
            {name: 'key',       required: true,  length: 50},
            {name: 'value',     required: true},
            {name: 'user',      required: true}
        ]
    },


  //**************************************************************************
  //** UserInterest
  //**************************************************************************
    UserInterest: {
        fields: [
            {name: 'user',          type: 'User'},
            {name: 'opportunity',   type: 'Opportunity'},
            {name: 'interest',      type: 'boolean'},
            {name: 'info',          type: 'json'}
        ],
        constraints: [
            {name: 'user',          required: true, onDelete: 'cascade'},
            {name: 'opportunity',   required: true, onDelete: 'cascade'},
            {name: 'interest',      required: true}
        ]
    }


};