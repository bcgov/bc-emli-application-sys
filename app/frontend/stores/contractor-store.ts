import { t } from 'i18next';
import { Instance, flow, types } from 'mobx-state-tree';
import { createSearchModel } from '../lib/create-search-model';
import { withEnvironment } from '../lib/with-environment';
import { withMerge } from '../lib/with-merge';
import { withRootStore } from '../lib/with-root-store';
import { IContractor, ContractorModel } from '../models/contractor';
import { ContractorOnboardModel } from '../models/contractor-onboard';

export enum EContractorSortFields {
  id = 'number',
  contactName = 'contact_name',
  contactEmail = 'contact_email',
  businessName = 'business_name',
  updatedAt = 'updated_at',
}

export enum ESuspendedContractorSortFields {
  id = 'number',
  businessName = 'business_name',
  contactName = 'contact_name',
  suspendedAt = 'suspended_at',
  suspendedBy = 'suspended_by_name',
}

export enum ERemovedContractorSortFields {
  id = 'number',
  businessName = 'business_name',
  contactName = 'contact_name',
  deactivatedAt = 'deactivated_at',
  deactivatedBy = 'deactivated_by_name',
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
    getSortColumnHeader(field: EContractorSortFields | ESuspendedContractorSortFields | ERemovedContractorSortFields) {
      const fieldMap = {
        [EContractorSortFields.id]: 'contractor.fields.contractorId',
        [EContractorSortFields.contactName]: 'contractor.fields.primaryContactName',
        [EContractorSortFields.contactEmail]: 'contractor.fields.primaryContactEmail',
        [EContractorSortFields.businessName]: 'contractor.fields.doingBusinessAs',
        [EContractorSortFields.updatedAt]: 'contractor.fields.lastUpdated',
        [ESuspendedContractorSortFields.suspendedAt]: 'contractor.fields.dateSuspended',
        [ESuspendedContractorSortFields.suspendedBy]: 'contractor.fields.suspendedBy',
        [ERemovedContractorSortFields.deactivatedAt]: 'contractor.fields.dateRemoved',
        [ERemovedContractorSortFields.deactivatedBy]: 'contractor.fields.removedBy',
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
        const contactId = contractor.contact.id;
        contractor.contactId = contactId;
        contractor.contact = contactId;
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
      if (contractor && contractor.suspendedBy) {
        self.rootStore.userStore.mergeUpdate(contractor.suspendedBy, 'usersMap');
        contractor.suspendedById = contractor.suspendedBy.id;
        delete contractor.suspendedBy;
      }
      if (contractor && contractor.deactivatedBy) {
        self.rootStore.userStore.mergeUpdate(contractor.deactivatedBy, 'usersMap');
        contractor.deactivatedById = contractor.deactivatedBy.id;
        delete contractor.deactivatedBy;
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
    setCurrentContractorById(id: string) {
      if (self.contractorsMap.has(id)) {
        self.currentContractor = self.contractorsMap.get(id);
      } else {
        self.currentContractor = null;
      }
    },
    findByContactId(contactId: string) {
      return Array.from(self.contractorsMap.values()).find((contractor) => contractor.contactId === contactId) || null;
    },
    setStatusFilter(status: 'active' | 'suspended' | 'removed') {
      self.statusFilter = status;
      // Trigger a new search with the status filter
      (self as any).searchContractors({ reset: true });
    },
    setStatusWithoutSearch(status: 'active' | 'suspended' | 'removed') {
      self.statusFilter = status;
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
        const normalizedData = response.data.data.map((c) => ({
          ...c,
          contactId: c.contact?.id ?? null,
        }));
        self.mergeUpdateAll(normalizedData, 'contractorsMap');
        self.setTableContractors(normalizedData);
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
    fetchOnboarding: flow(function* (contractorId: string) {
      const response = yield self.environment.api.getContractorOnboarding(contractorId);
      if (response.ok && response.data) {
        return response.data.data; // pass back to UI layer
      }
      return null;
    }),
    createOnboarding: flow(function* (contractorId: string) {
      const response = yield self.environment.api.createContractorOnboarding(contractorId);
      if (!response.ok) return null;

      const data = response.data;

      const permitApplicationId = data.onboardApplication?.id;
      const contractorIdReturned = data.contractor?.id;

      self.setCurrentContractorById(contractorIdReturned);

      return {
        permitApplicationId,
        contractorId: contractorIdReturned,
      };
    }),
    suspendContractor: flow(function* (contractorId: string, reason: string) {
      const response = yield self.environment.api.suspendContractor(contractorId, reason);

      if (response.ok) {
        // Reload the contractor to get updated status
        yield self.fetchContractor(contractorId);
      }

      return response;
    }),
    unsuspendContractor: flow(function* (contractorId: string) {
      const response = yield self.environment.api.unsuspendContractor(contractorId);

      if (response.ok) {
        // Reload the contractor to get updated status
        yield self.fetchContractor(contractorId);
      }

      return response;
    }),
    deactivateContractor: flow(function* (contractorId: string, reason: string) {
      const response = yield self.environment.api.deactivateContractor(contractorId, reason);

      if (response.ok) {
        // Reload the contractor to get updated status
        yield self.fetchContractor(contractorId);
      }

      return response;
    }),
    mergeContractor(contractorData: any) {
      try {
        // Clone the data to avoid mutating the original
        const processedData = { ...contractorData };

        // Remove employees and onboardings entirely to avoid MobX validation errors
        // These arrays contain user objects with invalid/undefined roles that fail validation
        delete processedData.employees;
        delete processedData.onboardings;

        // Also remove contact if it's an object (should be just an ID)
        if (processedData.contact && typeof processedData.contact === 'object') {
          processedData.contactId = processedData.contact.id;
          delete processedData.contact;
        }

        // Now add the contractor directly to the map
        const existingContractor = self.contractorsMap.get(processedData.id);
        if (existingContractor) {
          // Merge with existing
          self.contractorsMap.put({ ...existingContractor, ...processedData });
        } else {
          // Add new
          self.contractorsMap.put(processedData);
        }
      } catch (error) {
        console.error('Error merging contractor:', error, contractorData);
        // Silently fail to avoid breaking the UI
      }
    },
  }));

export interface IContractorStore extends Instance<typeof ContractorStoreModel> {}
