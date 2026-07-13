/* eslint-disable @typescript-eslint/no-empty-object-type */
import { ICollaborator } from '../models/collaborator';
import { IPermitApplication } from '../models/energy-savings-application';
import { IJurisdiction } from '../models/jurisdiction';
import { IProgram } from '../models/program';
import { IRequirementBlock } from '../models/requirement-block';
import { IRequirementTemplate } from '../models/requirement-template';
import { IUser } from '../models/user';
import { INotification, IOption, ITemplateVersionDiff } from './types';

export interface IApiResponse<TData, TMeta> {
  data: TData;
  meta: TMeta;
}

export interface IPageMeta {
  totalPages: number;
  totalCount: number;
  currentPage: number;
}

export type IUserResponse = IApiResponse<IUser, {}>;

export type IRequirementBlockResponse = IApiResponse<IRequirementBlock[], IPageMeta>;

export type IRequirementTemplateResponse = IApiResponse<IRequirementTemplate[], IPageMeta>;

export type IJurisdictionResponse = IApiResponse<IJurisdiction[], IPageMeta>;

export type IProgramResponse = IApiResponse<IProgram[], IPageMeta>;

export type IUsersResponse = IApiResponse<IUser[], IPageMeta>;

export type IJurisdictionPermitApplicationResponse = IApiResponse<IPermitApplication[], IPageMeta>;

export type ICollaboratorSearchResponse = IApiResponse<ICollaborator[], IPageMeta>;

export type IAcceptInvitationResponse = IApiResponse<{}, { redirectUrl: string }>;

export type IInvitationResponse = IApiResponse<{ invited: IUser[]; reinvited: IUser[]; emailTaken: IUser[] }, {}>;

export type IOptionResponse<T = string> = IApiResponse<IOption<T>[], IPageMeta>;

export interface INotificationResponse {
  data: INotification[];
  meta: { unreadCount: number; totalPages: number };
}

export interface ITemplateVersionDiffResponse {
  data: ITemplateVersionDiff;
}

export interface IAhriLookupResponse {
  referenceId: string;
  programId: number;
  make?: string;
  model?: string;
  outdoorUnitBrandName?: string;
  modelNumber?: string;
  error?: string;
}

export type IEmployeeActionResponse = IApiResponse<null, { message: { type: string; title: string; message: string } }>;
