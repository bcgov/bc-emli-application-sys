import { t } from 'i18next';
import { Instance, flow, types } from 'mobx-state-tree';
import { createSearchModel } from '../lib/create-search-model';
import { withEnvironment } from '../lib/with-environment';
import { withMerge } from '../lib/with-merge';
import { withRootStore } from '../lib/with-root-store';
import { IContractor, ContractorModel } from '../models/contractor';

export enum EContractorSortFields {
  id = 'id',
  contactName = 'contact_name',
  contactEmail = 'contact_email',
  businessName = 'business_name',
  program = 'program',
  updatedAt = 'updated_at',
}

export const ContractorStoreModel = types
  .compose(
    types.model('ContractorStoreModel').props({
      contractorsMap: types.map(ContractorModel),
      tableContractors: types.array(types.reference(ContractorModel)),
      currentContractor: types.maybeNull(types.safeReference(ContractorModel)),
      statusFilter: types.optional(types.enumeration(['active', 'suspended', 'removed']), 'active'),
    }),
    createSearchModel<EContractorSortFields>('searchContractors'),
  )
  .extend(withEnvironment())
  .extend(withRootStore())
  .extend(withMerge())
  .views((self) => ({
    getSortColumnHeader(field: EContractorSortFields) {
      const fieldMap = {
        [EContractorSortFields.id]: 'contractor.fields.contractorId',
        [EContractorSortFields.contactName]: 'contractor.fields.primaryContactName',
        [EContractorSortFields.contactEmail]: 'contractor.fields.primaryContactEmail',
        [EContractorSortFields.businessName]: 'contractor.fields.doingBusinessAs',
        [EContractorSortFields.program]: 'contractor.fields.program',
        [EContractorSortFields.updatedAt]: 'contractor.fields.lastUpdated',
      };
      //@ts-ignore
      return t(fieldMap[field]);
    },
    get contractors(): IContractor[] {
      return Array.from(self.contractorsMap.values()) as IContractor[];
    },
    getContractor(id: string) {
      return self.contractorsMap.get(id);
    },
  }))
  .actions((self) => ({
    __beforeMergeUpdate(contractor) {
      if (contractor && contractor.contact) {
        self.rootStore.userStore.mergeUpdate(contractor.contact, 'usersMap');
        contractor.contact = contractor.contact.id;
      }
      if (contractor && contractor.employees) {
        contractor.employees.forEach((employee) => {
          // Only merge employees that have complete data (including role field)
          if (employee.role) {
            self.rootStore.userStore.mergeUpdate(employee, 'usersMap');
          }
        });
        contractor.employees = contractor.employees.map((emp) => emp.id);
      }
      return contractor;
    },
    setTableContractors: (contractors) => {
      self.tableContractors = contractors.map((contractor) => contractor.id);
    },
    setContractors(contractors) {
      contractors.forEach((c) => self.contractorsMap.put(c));
    },
    removeContractor(contractor: IContractor) {
      const contractorId = contractor.id;
      // Remove from tableContractors first to avoid reference errors
      const filteredContractors = self.tableContractors.filter((c) => {
        try {
          return c.id !== contractorId;
        } catch (e) {
          // If reference resolution fails, exclude this item
          return false;
        }
      });
      self.tableContractors.replace(filteredContractors);
      // Then remove from contractorsMap
      self.contractorsMap.delete(contractorId);
    },
    setCurrentContractor(contractorId: string | null) {
      self.currentContractor = contractorId;
    },
    setStatusFilter(status: 'active' | 'suspended' | 'removed') {
      self.statusFilter = status;
      // Trigger a new search with the status filter
      (self as any).searchContractors({ reset: true });
    },
  }))
  .actions((self) => ({
    searchContractors: flow(function* (
      opts: {
        reset?: boolean;
        page?: number;
        countPerPage?: number;
      } = {},
    ) {
      if (opts.reset) {
        self.resetPages();
      }

      const searchParams = {
        query: self.query,
        sort: self.sort,
        page: opts.page ?? self.currentPage,
        perPage: opts.countPerPage ?? self.countPerPage,
        status: self.statusFilter,
      };

      const response = yield self.environment.api.fetchContractors(searchParams);

      if (response.ok) {
        self.mergeUpdateAll(response.data.data, 'contractorsMap');
        self.setTableContractors(response.data.data);
        self.currentPage = opts.page ?? self.currentPage;
        self.totalPages = response.data.meta.totalPages;
        self.totalCount = response.data.meta.totalCount;
        self.countPerPage = opts.countPerPage ?? self.countPerPage;
      }
      return response.ok;
    }),
    createContractor: flow(function* (formData) {
      const response = yield self.environment.api.createContractor(formData);
      if (response.ok) {
        self.mergeUpdate(response.data.data, 'contractorsMap');
        yield (self as any).searchContractors({ reset: true });
      }
      return response;
    }),
    fetchContractor: flow(function* (contractorId: string) {
      const response = yield self.environment.api.fetchContractor(contractorId);
      if (response.ok) {
        self.mergeUpdate(response.data.data, 'contractorsMap');
      }
      return response;
    }),
  }));

export interface IContractorStore extends Instance<typeof ContractorStoreModel> {}
