export interface IProjectStatus {
  name: string;
  priority?: number;
}

export interface ICreateProjectStatus {
  name: string;
  priority?: number;
}

export interface IUpdateProjectStatus {
  name?: string;
  priority?: number;
}
