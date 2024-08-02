// const { ClientCredentials, ResourceOwnerPassword, AuthorizationCode } = require('simple-oauth2');
// const passport = require('passport');
// const OAuth2Strategy = require('passport-oauth2').Strategy;
const { createClient, RedisClientType } = require('redis');
const axios = require('axios');
const crypto = require('crypto');
const url = require('url');

// Configure the OAuth 2.0 strategy
const USER_CENTER_URL = process.env.USER_CENTER_URL;
const BASE_URL = process.env.BASE_URL;
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;
const TOKEN_API = process.env.TOKEN_API;
const APP_TOKEN_API = process.env.APP_TOKEN_API;
const TENANT_TOKEN_API = process.env.TENANT_TOKEN_API;
const USER_INFO_API = process.env.USER_INFO_API;
const REFRESH_API = process.env.REFRESH_API;

const TENANT_INFO_API = process.env.TENANT_INFO_API;
const EMPLOYEES_API = process.env.EMPLOYEES_API;
const ROLES_API = process.env.ROLES_API;
const ROLE_USERS_API = process.env.ROLE_USERS_API;
const APP_INFO_API = process.env.APP_INFO_API;
const APP_ADMINS_API = process.env.APP_ADMINS_API;
const APP_IS_ADMIN_API = process.env.APP_IS_ADMIN_API;

const state = '123';
const loginApi = `/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&state=${state}`;

// passport.use(new OAuth2Strategy({
//   authorizationURL: `${USER_CENTER_URL}${loginApi}`,
//   tokenURL: `${BASE_URL}${TOKEN_API}`,
//   clientID: CLIENT_ID,
//   clientSecret: CLIENT_SECRET,
//   callbackURL: REDIRECT_URI
// },
// (accessToken, refreshToken, profile, cb) => {
//   console.log('accessToken = ' + accessToken);
//   console.log('refreshToken = ' + refreshToken);
//   console.log('profile = ', profile);
//   // This function will be called after the user has successfully authenticated
//   // with the OAuth 2.0 provider. You can use this callback to create or update a user
//   // in your database and set the user's session cookie.
//   return cb(null, profile);
// }
// ));

const signCode = (code) => {
  const str = `${CLIENT_ID}_${CLIENT_SECRET}_${code}`;
  return crypto.createHash("md5").update(str).digest("hex");
}

const getPassportTokenInfo = async (payload) => {
  const username = payload.username;
  const password = payload.password;
  console.log('getPassportTokenInfo username = ' + username);
  console.log('getPassportTokenInfo password = ' + password);

  const url = 'https://sit-passport.yoov.com.cn/auth/realms/yoov/protocol/openid-connect/token';
  try {
    const result = await axios.post(url,
      {
        client_id: 'yoov-oa',
        grant_type: 'password',
        username,
        password
      }
    )
    console.log('result: ', result);
    return result.data.data;
  } catch(err) {
    console.log('getPassportTokenInfo: error');
    throw err;
  }
}

const getOpenIdTokenInfo = async (code) => {
  const url = process.env.OPENID_TOKEN_URL;
  try {
    const result = await axios.post(url, 
      {
        code,
        grant_type: 'authorization_code',
        client_id: 'yoov-oa',
        redirect_uri: REDIRECT_URI
      },
      {
        headers: {
          "Content-Type": "application/json;charset=UTF-8",
        }
      }
    );
    return result.data.data;
  } catch(err) {
    console.log('getOpenIdTokenInfo: error');
    throw err;
  }
}

const getTeamInfos = async (accessToken, tenantId) => {
  const url = 'https://uat3-usercenter.yoov.com.cn/uc/api/v1/manager/teams?size=10&current=1';
  try {
    const result = await axios.get(url, {
      headers: {
        "Content-Type": "application/json;charset=UTF-8",
        Authorization: `Bearer ${accessToken}`,
      }
    })
    return result.data.data;
  } catch(err) {
    console.log('getTeamInfos: error');
    throw err;
  }
}


const refreshTokenInfo = async (refreshToken) => {
  console.log('refreshTokenInfo: refreshToken = ' + refreshToken);
  console.log('refreshTokenInfo: REFRESH_API = ' + REFRESH_API);
  const url = `${BASE_URL}${REFRESH_API}`;
  try {
    const result = await axios.post(
      url,
      {
        grant_type: 'authorization_code',
        refresh_token: refreshToken,
        client_id: CLIENT_ID,
      },
      {
        headers: {
          "Content-Type": "application/json;charset=UTF-8",
        }
      }
    )
    return result.data.data
  } catch(err) {
    console.log('refreshTokenInfo: error');
    throw err;
  }
}

const getUserInfo = async (accessToken) => {
  const url = `${BASE_URL}${USER_INFO_API}`;
  console.log(`getUserInfo url = ${url}`);
  console.log('getUserInfo accessToken = ' + accessToken);
  try {
    const result = await axios.get(
      url,
      {
        headers: {
          'Content-Type': 'applicaton/json;charset=UTF-8',
          Authorization: `Bearer ${accessToken}`
        }
      }
    )
    return result.data.data
  } catch(err) {
    console.log('refreshTokenInfo: error');
    throw err;
  }
}

const getTenantTokenInfo = async () => {
  const tenantTokenApiUrl = `${BASE_URL}${TENANT_TOKEN_API}`;
  console.log(`getTenantTokenInfo tenantTokenApiUrl = ${tenantTokenApiUrl}`);
  return await postByUrl(tenantTokenApiUrl);
}

const getAppTokenInfo = async () => {
  const appTokenApiUrl = `${BASE_URL}${APP_TOKEN_API}`;
  console.log(`getAppTokenInfo appTokenApiUrl = ${appTokenApiUrl}`);
  return await postByUrl(appTokenApiUrl);
}

const postByUrl = async (url) => {
  try {
    const result = await axios.post(
      url,
      {
        app_id: CLIENT_ID,
        app_secret: CLIENT_SECRET
      },
      {
        headers: {
          'Content-Type': 'application/json;charset=UTF-8'
        }
      }
    )
    return result.data.data;
  } catch(err) {
    console.log('postByUrl: error');
    throw err;
  }
}

const getByUrlAndToken = async (url, token) => {
  const options = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  }
  const result = await axios.get(url, options);
  return result.data.data;
}

const getByUrl = async (url, options) => {
  console.log('getByUrl url = ' + url);
  try {
    const result = await axios.get(
      url,
      options
    )
    return result.data.data;
  } catch(err) {
    console.log('getByUrl: error: ', err);
    throw err;
  }
}

const getTokenInfo = async (code) => {
  const tokenApiUrl = `${BASE_URL}${TOKEN_API}`;
  console.log(`getTokenInfo: url = ${tokenApiUrl}`)
  const sign = signCode(code);
  try {
    const result = await axios.post(
      tokenApiUrl,
      {
        grant_type: 'authorization_code',
        code,
        client_id: CLIENT_ID,
        sign
      },
      {
        headers: {
          'Content-Type': 'application/json;charset=UTF-8'
        }
      }
    )
    return result.data.data;
  } catch(err) {
    console.log('getTokenInfo: error');
    throw err;
  }
}

const getInfoByTenantApi = async (tenantToken, apiUrl) => {
  console.log(`getInfoByTenantApi: tenant token = ${tenantToken}`);
  console.log(`getInfoByTenantApi: apiUrl = ${apiUrl}`);
  try {
    // const url = `${USER_CENTER_URL}${apiUrl}`;
    const url = `${BASE_URL}${apiUrl}`;
    console.log(`getInfoByTenantApi: url = ${url}`);
    const result = await axios.get(url,
      {
        headers: {
          Authorization: `Bearer ${tenantToken}`
        }
      }
    );
    console.log('getInfoByTenantApi: result.data: ', result.data);
    return result.data.data;
  } catch(err) {
    console.log(`getInfoByTenantApi: error (${url})`);
    throw err;
  }
}
// const getTeamInfo = async(token) => {
//   console.log('getTeamInfo: token = ' + token);
//   const url = `${BASE_URL}/open/api/v1/teams`;
//   try {
//     const result = await axios.get(url,
//       {
//         headers: {
//           Authorization: `Bearer ${token}`
//         }
//       }
//     );
//     return result.data.data;
//   } catch(err) {
//     console.log('getTeamInfo: error');
//     throw err;
//   }
// }

const getEmployeesInfo = async(token) => {
  console.log('getEmployeesInfo: token = ' + token);
  const url = `${BASE_URL}/open/api/v1/employees`;
  try {
    const result = await axios.get(url,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    )
    return result.data.data;
  } catch(err) {
    console.log('getEmployeesInfo: error');
    throw err;
  }
}

const showLog = (payload=null) => {
  if (payload) {
    const keys = Object.keys(payload);
    keys.forEach(key => {
      console.log(`callback: ${key}: `, payload[key]);
    })
  } else {
    console.log('===================');
    console.log('');
  }
}

const AuthController = {
  callback: async (req, res) => {
    // req.query:  {
    //   client_id: 'hqJOKrXEygcNsXLLB5zPRt9s',
    //   redirect_uri: 'http://localhost:3000/auth/callback',
    //   state: '123',
    //   code: 'MqWS1TZJiNk5xuS5snAzDrlmUrQ8lLor'
    // }

    const state = req.query.state;
    const code = req.query.code;
    let url = '';
    let options = null;
    let info = null;

    console.log('callback: code = ' + code);
    console.log();

    const payload = {};
    try {
      // use base (uat3-open)
      const tokenInfo = await getTokenInfo(code);
      showLog({tokenInfo});
      payload['tokenInfo'] = tokenInfo;
      showLog();

      // use base (uat3-open)
      const appTokenInfo = await getAppTokenInfo();
      const appAccessToken = appTokenInfo.app_access_token;
      showLog({appTokenInfo});
      payload['appTokenInfo'] = appTokenInfo;
      showLog();

      // use base (uat3-open)
      const tenantTokenInfo = await getTenantTokenInfo();
      const tenantAccessToken = tenantTokenInfo.tenant_access_token;
      showLog({tenantTokenInfo})
      payload['tenantTokenInfo'] = tenantTokenInfo;
      showLog();

      // use base (uat3-open)
      const userInfo = await getUserInfo(tokenInfo.access_token);
      showLog({userInfo});
      payload['userInfo'] = userInfo;
      showLog();

      // use base (uat3-open)
      const newTokenInfo = await refreshTokenInfo(tokenInfo.refresh_token);
      const accessToken = newTokenInfo.access_token;
      showLog({newTokenInfo});
      payload['newTokenInfo'] = newTokenInfo;
      showLog();

      console.log('**********');
      console.log(`code = ${code}`);
      console.log(`access_token = ${accessToken}`);
      console.log(`app_access_token = ${appAccessToken}`);
      console.log(`tenant_access_token = ${tenantAccessToken}`);
      console.log('**********');

      // use OPENID_TOKEN_URL
      // const openIdTokenInfo = await getOpenIdTokenInfo(code);
      // showLog({openIdTokenInfo});
      // payload['openIdTokenInfo'] = openIdTokenInfo;
      // showLog();



      console.log('**********');
      console.log(`code = ${code}`);
      console.log(`access_token = ${accessToken}`);
      console.log(`app_access_token = ${appAccessToken}`);
      console.log(`tenant_access_token = ${tenantAccessToken}`);
      console.log('**********');
      console.log();

      //*********************
      // getTeamInfo
      //*********************
      console.log('getTeamInfo');
      try {
        let teamInfoRes = await getByUrlAndToken(
          `${BASE_URL}${TENANT_INFO_API}`,
          tenantAccessToken
        );
        console.log('teamInfoRes: ', teamInfoRes);
        payload['teamInfo'] = teamInfoRes;
      } catch(err) {
        console.log('err: ', err);
        throw err;
      }
      console.log();

      //*********************
      // getCurrentMemberInfo
      //*********************
      console.log('getCurrentMemberInfo');
      try {
        let currentMemberInfoRes = await getByUrlAndToken(
          `${BASE_URL}${USER_INFO_API}`,
          accessToken
        );
        console.log('getCurrentMemberInfo: currentMemberInfoRes: ', currentMemberInfoRes);
        payload['currentMemberInfo'] = currentMemberInfoRes;
      } catch(err) {
        console.log('err: ', err);
        throw err;
      }
      console.log();

      //*********************
      // getMemberListByPage
      //*********************
      console.log('getMemberListByPage');
      try {
        let memberListRes = await getByUrlAndToken(
          `${BASE_URL}${EMPLOYEES_API}`,
          tenantAccessToken
        );
        payload['memberList'] = memberListRes.records;
        console.log('memberListRes: ', memberListRes);
      } catch(err) {
        console.log('err: ', err);
        throw err;
      }
      console.log();
      
      const employeeId = payload['memberList'][0].open_id;
      //*********************
      // getMemberInfo
      //*********************
      console.log(`getMemberInfo: employeeId = ${employeeId}`);
      try {
        let memberInfoRes = await getByUrlAndToken(
          `${BASE_URL}${EMPLOYEES_API}/${employeeId}`,
          tenantAccessToken
        );
        console.log('memberInfoRes: ', memberInfoRes);
      } catch(err) {
        console.log('err.data.message: ', err.data.message);
        throw err;
      }
      console.log();
      
            
      //*********************
      // get roles
      //*********************
      console.log(`getRoles`);
      try {
        let rolesRes = await getByUrlAndToken(
          `${BASE_URL}${ROLES_API}`,
          tenantAccessToken
        );
        console.log('getRoles: ', rolesRes);
        payload['roles'] = rolesRes;
      } catch(err) {
        console.log('err.data.message: ', err.data.message);
        throw err;
      }
      console.log();
      
      // let adminRole = null;
      // try {
      //   for (let i = 0; i < payload['roles'].length; i++) {
      //     const loopRole = payload['roles'][i];
      //     console.log('loopRole.name = ' + loopRole.name);
      //     if (loopRole.name === 'Administrator') {
      //       console.log('is admin');
      //       adminRole = loopRole;
      //       break;
      //     } else {
      //       console.log('is not admin');
      //     }
      //   }
      // } catch(err) {
      //   console.log('err: ', err);
      // }     
      const adminRole = payload['roles'].find(role => role.name === 'Administrator');
      console.log('adminRole: ', adminRole);         
      const roleId = adminRole?.id || '';
      
      //*********************
      // get members in role
      //*********************
      try {
        console.log(`getRoleUsers: roleId = ${roleId}`);
      } catch(err) {
        console.log('err: ', err);
      }
      if (roleId) {
        try {
          const url = `${BASE_URL}${ROLE_USERS_API}`.replace('{ROLE-ID}', roleId);
          console.log('getRoleUsers: url = ' + url);
          let usersRes = await getByUrlAndToken(          
            url,
            tenantAccessToken
          );
          console.log('getRoleUsers: ', usersRes);
          payload['roleUsers'] = usersRes;
        } catch(err) {
          console.log('err.response.data: ', err.response.data);
          throw err;
        }
      } else {
        console.log('no role existes!');
      }
      console.log();


      //*********************
      // get application info
      //*********************
      const appId = CLIENT_ID;
      try {
        console.log(`getAppInfo: appId = ${appId}`);
      } catch(err) {
        console.log('err: ', err);
      }
      if (appId) {
        try {
          const url = `${BASE_URL}${APP_INFO_API}`.replace('{APP-ID}', appId);
          console.log('getAppInfo: url = ' + url);
          let appInfo = await getByUrlAndToken(          
            url,
            appAccessToken
          );
          console.log('getAppInfo: appInfo: ', appInfo);
          payload['appInfo'] = appInfo;
        } catch(err) {
          console.log('err.response.data: ', err.response.data);
          throw err;
        }
      } else {
        console.log('no role existes!');
      }
      console.log();


      //*********************
      // get application admin
      //*********************
      try {
        console.log(`getAppAdmins: appId = ${appId}`);
      } catch(err) {
        console.log('err: ', err);
      }
      let appAdmins = [];
      try {
        const url = `${BASE_URL}${APP_ADMINS_API}`;
        console.log('getAppAdmins: url = ' + url);
        appAdmins = await getByUrlAndToken(          
          url,
          appAccessToken
        );
        console.log('getAppAdmins: ', appAdmins);
        payload['appAdmins'] = appAdmins;
      } catch(err) {
        console.log('err.response.data: ', err.response.data);
        throw err;
      }
      console.log();

      const appAdminUserId = appAdmins.length > 0 ? appAdmins[0].user_id : '';



      //*********************
      // check is user an admin for the application
      //*********************
      try {
        console.log(`getIsAppAdmin: userId = ${appAdminUserId}`);
      } catch(err) {
        console.log('err: ', err);
      }
      if (appAdminUserId) {
        if (roleId) {
          try {
            const url = `${BASE_URL}${APP_IS_ADMIN_API}?user_id=${appAdminUserId}`;
            console.log('getIsAppAdmin: url = ' + url);
            let res = await getByUrlAndToken(          
              url,
              appAccessToken
            );
            console.log('getIsAppAdmin res: ', res);
          } catch(err) {
            console.log('err.response.data: ', err.response.data);
            throw err;
          }
        } else {
          console.log('no role existes!');
        }
      } else {
        console.log('no admin id specified!');
      }
      console.log();




      // *******************
      // APIs for Data Info
      // *******************
      // const tenantId = payload['userInfo'].tenant_id;
      // console.log(`Tenant Info: tenantId=${tenantId}, tenantAccessToken=${tenantAccessToken}`);
      // let url = `${BASE_URL}/open/api/v1/teams`;
      // let options =
      //   {
      //     'Content-Type': 'application/json',
      //     'Authorization': `Bearer ${tenantAccessToken}`
      //   };
      // let info = await getByUrl(url, options);
      // const TENANT_API_TEST =
      //   {
      //     apiType: 'tenant',
      //     token: tenantAccessToken,
      //     // token: accessToken,
      //     apis: [
      //       {id: 'teamInfo', apiUrl: '/open/api/v1/teams'},
      //       // {id: 'teamInfo', apiUrl: `/uc/api/v1/manager/teams?size=1&current=1&teamId=${tenantId}`},
      //       {id: 'employeesInfo', apiUrl: '/open/api/v1/employees'},
      //       {id: 'departmentTreeInfo', apiUrl: '/open/api/v1/departments/tree'},
      //       {id: 'departmentsInfo', apiUrl: '/open/api/v1/departments'},
      //       {id: 'rolesInfo', apiUrl: '/open/api/v1/roles'}, 
      //       // admin role id #1655786890051854337
      //       {id: 'roleUsersInfo', apiUrl: '/open/api/v1/roles/1655786890051854337/users'}

      //       // {id: 'teamInfo', apiUrl: '/open/api/v1/teams'},
      //       // {id: 'employeesInfo', apiUrl: '/open/api/v1/employees'},
      //       // {id: 'departmentTreeInfo', apiUrl: '/open/api/v1/departments/tree'},
      //       // {id: 'departmentsInfo', apiUrl: '/open/api/v1/departments'},
      //       // {id: 'rolesInfo', apiUrl: '/open/api/v1/roles'}, 
      //       // // admin role id #1655786890051854337
      //       // {id: 'roleUsersInfo', apiUrl: '/open/api/v1/roles/1655786890051854337/users'}
      //     ],              
      //   };
        
      // get openid_token_api
      // for (let j = 0; j < TENANT_API_TEST.apis.length; j++) {
      //   const apiInfo = TENANT_API_TEST.apis[j];
      //   console.log(`j=${j}: apiInfo:`, apiInfo);
      //   const loopKey = apiInfo.id;
      //   const apiUrl = apiInfo.apiUrl;
      //   const info = await getByUrl(TENANT_API_TEST.token, apiUrl);
      //   showLog({[loopKey]:info});
      //   payload[loopKey] = info;
      //   console.log('finished ' + loopKey);
      // }
      // console.log('********************'); console.log();

      // console.log(`Get App Info appAccessToken=${appAccessToken}`);
      // try {
      //   url = `${BASE_URL}/open/api/v1/applications/${CLIENT_ID}`;
      //   options =
      //     {
      //       'Content-Type': 'application/json',
      //       'Authorization': `Bearer ${appAccessToken}`
      //     };
      //   info = await getByUrl(url, options);
      // } catch(err) {
      //   console.log('err: ', err);
      // }
      // console.log('get app: info: ', info);    
      
      // const APP_API_TEST = 
      //   {
      //     apiType: 'application',
      //     token: appAccessToken,
      //     apis: [
      //       {id: 'appInfo', apiUrl: `/open/api/v1/applications/${CLIENT_ID}`}, 
      //     ]
      //   };
      // for (let j = 0; j < APP_API_TEST.apis.length; j++) {
      //   const apiInfo = APP_API_TEST.apis[j];
      //   const loopKey = apiInfo.id;
      //   console.log(`${i+1}. API: ${APP_API_TEST.apiType} / ${loopKey}`);
      //   const apiUrl = apiInfo.apiUrl;
      //   const info = await getByUrl(APP_API_TEST.token, apiUrl);
      //   showLog({[loopKey]:info});
      //   payload[loopKey] = info;
      //   console.log('finished ' + loopKey);
      // }
      console.log('********************'); console.log();
          
      console.log('finished');
      // const teamInfo = await getInfoByTenantApi(tenantAccessToken, '/open/api/v1/teams');
      // showLog({teamInfo});
      // payload['teamInfo'] = teamInfo;
      // // const teamInfos = await getTeamInfos(
      // //   tokenInfo.access_token,
      // //   userInfo.tenant_id
      // // );
      // // console.log('callback: teamInfos: ', teamInfos);
      
      // const employeesInfo = await getInfoByTenantApi(tenantAccessToken, '/open/api/v1/employees');
      // showLog(employeesInfo);
      // payload['employeesInfo'] = employeesInfo;

      // // const passportTokenInfo = await getPassportTokenInfo({
      // //   username: 'lankuyun002@sina.com',
      // //   password: 'Lanku001'
      // // });
      // // showLog({passwordTokenInfo})
      // // payload['passwordTokenInfo'] = passportTokenInfo;

      // const departmentTreeInfo = await getInfoByTenantApi( 
      //   tenantAccessToken,
      //   '/open/api/v1/departments/tree'
      // );
      // showLog(departmentTreeInfo);
      // payload['departmentTreeInfo'] = departmentTreeInfo;

      // const departmentsInfo = await getInfoByTenantApi(
      //   tenantAccessToken,
      //   '/open/api/v1/departments'
      // );
      // showLog(departmentsInfo);
      // payload['departmentsInfo'] = departmentsInfo;

      // const rolesInfo = await getInfoByTenantApi(
      //   tenantAccessToken,
      //   '/open/api/v1/roles'
      // );
      // showLog(rolesInfo);
      // payload['rolesInfo'] = rolesInfo;

      // const roles
      // const openIdTokenInfo = await getOpenIdTokenInfo(code);
      // console.log('callback: openIdTokenInfo: ', openIdTokenInfo);

      res.redirect(url.format({
        pathname: '/dashboard',
        query: payload
      }))

    } catch (err) {
      return res.status(400).json({
        result: false,
        message: err.message        
      })
    }
  },
  index: async (req, res) => {
    return res.json({hello: 'world'});
  },



  login: async (req, res) => {
    const state = '123';
    const loginApi = `/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&state=${state}`;
    const url = `${USER_CENTER_URL}${loginApi}`;

    return res.redirect(url);

    // console.log('login');
    // const url = 
    // return passport.authenticate('oauth2')
  },


  loginx: async (req, res) => {
    const config = {
      client: {
        id: process.env.CLIENT_ID,
        secret: process.env.CLIENT_SECRET
      },
      auth: {
        tokenHost: `${process.env.URL_BASE}${process.env.API_TOKEN}`
      }
    }
    console.log('ClientCredentials: ', ClientCredentials);
    console.log('ResourceOwnerPassword: ', ResourceOwnerPassword);
    console.log('AuthorizationCode: ', AuthorizationCode);
    console.log('config: ', config);

    const client = new AuthorizationCode(config);
    const authorizationUri = client.authorizeURL({
      redirect_uri: `${process.env.REDIRECT_URL}`,
      scope: 'scope',
      state: '1234567'
    })
    console.log('authorizationUri=' + authorizationUri);
    return res.redirect(authorizationUri);

  }
}

module.exports = AuthController;
