var package = "com.kartographia.prospekt";
var models = {

  //**************************************************************************
  //** Contact
  //**************************************************************************
    Contact: {
        fields: [
            {name: 'firstName',    type: 'string'},
            {name: 'lastName',     type: 'string'},
            {name: 'fullName',     type: 'string'},
            {name: 'gender',       type: 'string'},
            {name: 'dob',          type: 'string'},
            {name: 'info',         type: 'json'}
        ]
    },


  //**************************************************************************
  //** User
  //**************************************************************************
    User: {
        fields: [
            {name: 'username',    type: 'string'},
            {name: 'password',    type: 'password'},
            {name: 'accessLevel', type: 'int'},
            {name: 'active',      type: 'boolean'},
            {name: 'contact',     type: 'Contact'},
            {name: 'auth',        type: 'json'},
            {name: 'info',        type: 'json'}
        ],
        constraints: [
            {name: 'username',      required: true,  length: 255,  unique: true},
            {name: 'password',      required: true},
            {name: 'accessLevel',   required: true},
            {name: 'active',        required: true}
        ],
        defaults: [
            {name: 'active',    value: true}
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
  //** Source
  //**************************************************************************
    Source: {
        fields: [
            {name: 'name',         type: 'string'},
            {name: 'description',  type: 'string'},
            {name: 'info',         type: 'json'}
        ],
        constraints: [
            {name: 'name',       required: true}
        ]
    },


  //**************************************************************************
  //** Opportunity
  //**************************************************************************
    Opportunity: {
        fields: [
            {name: 'name',              type: 'string'},
            {name: 'description',       type: 'string'},
            {name: 'organization',      type: 'string'}, //fullParentPathName
            {name: 'type',              type: 'string'}, //FFP, T&M, IDIQ, etc
            {name: 'naics',             type: 'string'},
            {name: 'setAside',          type: 'string'},
            {name: 'classification',    type: 'string'},
            {name: 'postedDate',        type: 'date'},
            {name: 'reponseDate',       type: 'date'}, //reponseDeadLine
            {name: 'startDate',         type: 'date'},
            {name: 'value',             type: 'long'},
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
  //** Tag
  //**************************************************************************
    Tag: {
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