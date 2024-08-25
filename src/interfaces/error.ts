export interface IError {
  message: string;
  stack: string;
  resolved: boolean;
  stage: string;
  api: string;
  location: string;
  body: object;
}

