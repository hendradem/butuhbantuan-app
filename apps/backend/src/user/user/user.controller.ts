import { Controller, Post, Get, Req, Query, Header, HttpCode, HttpRedirectResponse, Redirect } from "@nestjs/common";

@Controller("api/users")
export class UserController {
  @Post()
  post(): string {
    return "post";
  }

  @Get("/sample")
  get(): string {
    const data = "sample page";
    return data;
  }

  // @Get('/:id')
  // getById(@Req() request: Request): string {
  //   return `Get ${request.params.id}`;
  // }

  @Get("/hello")
  sayHello(@Query("first_name") firstName: string, @Query("last_name") lastName: string): string {
    return `Hello ${firstName} ${lastName}`;
  }

  @Get("/sample-response")
  @Header("Content-Type", "application/json")
  @Header("Content-Type", "application/json; charset=utf-8")
  @HttpCode(200)
  sampleResponse(): Record<string, string> {
    return {
      data: "Sample JSON Response",
    };
  }

  @Get("/redirect")
  @Redirect()
  redirect(): HttpRedirectResponse {
    return {
      url: "https://google.com",
      statusCode: 302,
    };
  }
}
