import Axios, { AxiosInstance } from "axios";
import * as _crypto from "crypto";
import { IncomingMessage, Server, ServerResponse } from "http";
import Fastify, {
  FastifyInstance,
  FastifyRequest,
  FastifyServerOptions,
  RouteGenericInterface,
  RouteOptions,
} from "fastify";
import { createClient, RedisClientType } from "redis";
interface AuthOptions {
  clientId: string;
  secret: string;
  redirectUri?: string;
  redis: RedisClientType;
}

interface BaseResponse {
  request_id?: string;
  code: string;
  msg: string;
}

interface Token {
  access_token: string;
  token_type: "Bearer";
  expires_in: number;
  refresh_token: string;
  refresh_expires_in: number;
}
interface AppAccessToken {
  app_access_token: string;
  expires_in: number;
}
interface TenantAccessToken {
  tenant_access_token: string;
  expires_in: number;
}
interface TokenApiResponse extends BaseResponse {
  data: Token;
}

interface UserInfo {
  name: string;
  avatar_url: string;
  open_id: number;
  union_id: string;
  user_id: string;
  email: string;
  mobile: string;
  tenant_id: string;
}

interface UserInfoResponse extends BaseResponse {
  data: UserInfo;
}
interface AppTokenApiResponse extends BaseResponse {
  data: AppAccessToken;
}
interface TenantTokenApiResponse extends BaseResponse {
  data: TenantAccessToken;
}

class Auth {
  private clientId: string;
  private secret: string;
  private redirectUri: string | undefined;
  private axios: AxiosInstance;
  private redis: RedisClientType;

  public static readonly baseUrl = "https://uat3-open.yoov.com.cn";
  public static readonly userCenterUrl = "https://uat3-usercenter.yoov.com.cn";
  public static readonly tokenApi = "/auth/api/v1/third/access_token";
  public static readonly userInfoApi = "/auth/v2/user_info";
  public static readonly refreshApi = "/auth/api/v1/third/refresh_access_token";
  public static readonly appTokenApi = "/auth/v2/app_access_token/internal";
  public static readonly tenantTokenApi =
    "/auth/v2/tenant_access_token/internal";
  public static readonly userTokenApi = "/auth/v2/access_token";

  constructor(options: AuthOptions) {
    this.clientId = options.clientId;
    this.secret = options.secret;
    this.redirectUri = options.redirectUri;
    this.axios = Axios.create({
      baseURL: Auth.baseUrl,
    });
    this.redis = options.redis;
  }

  public getLoginUrl(state = "") {
    let result = `${Auth.userCenterUrl}/oauth/authorize?client_id=${
      this.clientId
    }&redirect_uri=${this.redirectUri || ""}`;
    if (state) result = result.concat(`&state=${state}`);
    return result;
  }
  public async getAccessToken(code: string) {
    const result = await this.axios.post<TokenApiResponse>(
      Auth.tokenApi,
      {
        grant_type: "authorization_code",
        code,
        client_id: this.clientId,
        sign: this.sign(code),
      },
      {
        headers: {
          "Content-Type": "application/json;charset=UTF-8",
        },
      }
    );
    return result.data.data;
  }

  public async getAppAccessToken() {
    const result = await this.axios.post<AppTokenApiResponse>(
      Auth.appTokenApi,
      {
        app_id: this.clientId,
        app_secret: this.secret,
      },
      {
        headers: {
          "Content-Type": "application/json;charset=UTF-8",
        },
      }
    );
    return result.data.data;
  }
  public async getTenantAccessToken() {
    const result = await this.axios.post<TenantTokenApiResponse>(
      Auth.tenantTokenApi,
      {
        app_id: this.clientId,
        app_secret: this.secret,
      },
      {
        headers: {
          "Content-Type": "application/json;charset=UTF-8",
        },
      }
    );
    return result.data.data;
  }
  public async getUserInfo(accessToken: string) {
    const result = await this.axios.get<UserInfoResponse>(Auth.userInfoApi, {
      headers: {
        "Content-Type": "application/json;charset=UTF-8",
        Authorization: `Bearer ${accessToken}`,
      },
    });
    return result.data.data;
  }

  public async refreshToken(userId: string, token: string, cache = true) {
    const result = await this.axios.post<TokenApiResponse>(
      Auth.userInfoApi,
      {
        grant_type: "authorization_code",
        refresh_token: token,
        client_id: this.clientId,
      },
      {
        headers: {
          "Content-Type": "application/json;charset=UTF-8",
        },
      }
    );
    if (cache) await this.cache(userId, result.data.data);
    return result.data.data;
  }

  public async cache(userId: string, token: Token) {
    await redisClient.set(`${userId}:access_token`, token.access_token, {
      EX: token.expires_in,
    });
    await redisClient.set(`${userId}:refresh_token`, token.refresh_token, {
      EX: token.refresh_expires_in,
    });
  }
  private sign(code: string): string {
    const str = `${this.clientId}_${this.secret}_${code}`;
    return _crypto.createHash("md5").update(str).digest("hex");
  }
}

class AESUtil {
  private readonly aesKey: string;

  constructor(key: string) {
    this.aesKey = key;
  }

  decrypt(data: string) {
    const digest = _crypto.createHash("sha256");
    const keyBytes = digest.update(this.aesKey).digest();

    const finalData = Buffer.from(data, "base64");
    const ivBytes = finalData.subarray(0, 16);
    const dataBytes = finalData.subarray(16);
    const secretKeySpec = _crypto.createDecipheriv(
      "aes-256-cbc",
      keyBytes,
      ivBytes
    );
    let decrypted = Buffer.concat([
      secretKeySpec.update(dataBytes),
      secretKeySpec.final(),
    ]);

    return decrypted.toString("utf-8");
  }
  compareSign(
    timestamp: string,
    nonce: string,
    encrypt: string,
    signToBeCompared: string
  ) {
    const content = `${timestamp}${nonce}${this.aesKey}${encrypt}`;
    const hash = _crypto.createHash("sha-256");
    const sign = hash.update(Buffer.from(content)).digest().toString("hex");
    return sign === signToBeCompared;
  }
}

class FastifyServer {
  fastify: FastifyInstance;
  redis: RedisClientType;
  constructor(options: FastifyServerOptions, redis: any) {
    this.fastify = Fastify(options);
    this.redis = redis;
  }

  addRoute<T extends RouteGenericInterface>(
    options: RouteOptions<Server, IncomingMessage, ServerResponse, T>
  ) {
    this.fastify.route(options);
  }
  initRedis() {}
  async start() {
    await this.redis.connect();
    return this.fastify.listen({ host: "0.0.0.0", port: 8080 });
  }
  get log() {
    return this.fastify.log;
  }
}
const redisClient = createClient() as RedisClientType;

const auth = new Auth({
  clientId: "zXlnTZ572Vwj3dIhrmiwkunk",
  secret: "2BPpQylswoa5xJ4yapuNR5vwr6mPohCS",
  redirectUri: "http://localhost:8080",
  redis: redisClient,
});
const decipher = new AESUtil("DG11B5egWTykExFBarRwybgqf9RCCFgf");

const server = new FastifyServer(
  {
    logger: {
      transport: {
        target: "pino-pretty",
        options: {
          ignore: "pid,hostname",
        },
      },
    },
  },
  redisClient
);

server.addRoute({
  method: "GET",
  url: "/callback",
  handler: async (
    req: FastifyRequest<{
      Querystring: { code: string };
    }>,
    res
  ) => {
    const code = req.query.code;
    if (!code) {
      return res.status(400).send("No code.");
    }
    const result = await auth.getAccessToken(code);

    const userInfo = await auth.getUserInfo(result.access_token);
    await auth.cache(userInfo.user_id, result);
    //add local auth+user mgmt logic here
    return res.status(200).send(JSON.stringify(userInfo));
  },
});

type WebhookRequestBodyHeader = {
  tenant_key: string;
  event_id: string;
  event_type: string;
  create_time: string;
  app_id: string;
  token: string;
};

type Challenge = {
  challenge: string;
};

interface WebhookRequestBody {
  header: WebhookRequestBodyHeader;
  event: Challenge | Record<string, any>;
}

function isChallengeType(object: any): object is Challenge {
  return "challenge" in object;
}

server.addRoute({
  method: "POST",
  url: "/dept_webhook",
  handler: async (
    req: FastifyRequest<{
      Body: { encrypt: string };
      Headers: {
        "X-Lark-Signature": string;
        "X-Lark-Request-Timestamp": string;
        "X-Lark-Request-Nonce": string;
      };
    }>,
    res
  ) => {
    // console.log("req:headers", req.headers);
    // console.log("req:body", req.body);
    const decrypt = decipher.decrypt(req.body.encrypt);
    // const signatureInHeader = req.headers["X-Lark-Signature"];
    // const timestamp = req.headers["X-Lark-Request-Timestamp"];
    // const nonce = req.headers["X-Lark-Request-Nonce"];
    // if (
    //   !decipher.compareSign(
    //     timestamp,
    //     nonce,
    //     req.body.encrypt,
    //     signatureInHeader
    //   )
    // ) {
    //   console.log("signature", signatureInHeader);
    //   return res.status(400).send("cannot compare signature");
    // }
    const parsed: WebhookRequestBody = JSON.parse(decrypt);
    if (isChallengeType(parsed.event)) {
      return res.send({ challenge: parsed.event.challenge });
    } else {
      console.log("event", parsed.event);
      return res.send({
        code: "200",
        msg: "请求成功",
        data: {
          event_id: parsed.header.event_id,
        },
      });
    }
  },
});

server.addRoute({
  method: "GET",
  url: "/app_access_token",
  handler: async (req, res) => {
    return await auth.getAppAccessToken();
  },
});

try {
  server.start();
} catch (err) {
  server.log.error(err);
  process.exit(1);
}
