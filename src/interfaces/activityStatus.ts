export interface IActivityStatus {
  name: string;
  priority?: number;
}

export interface ICreateActivityStatus {
  name: string;
  priority?: number;
}

export interface IUpdateActivityStatus {
  name?: string;
  priority?: number;
}
