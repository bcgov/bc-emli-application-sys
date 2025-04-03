import { t } from 'i18next';
import { Instance, cast, flow, toGenerator, types } from 'mobx-state-tree';
import * as R from 'ramda';
import { TCreateProgramFormData } from '../components/domains/programs/new-program-screen';
import { createSearchModel } from '../lib/create-search-model';
import { withEnvironment } from '../lib/with-environment';
import { withMerge } from '../lib/with-merge';
import { withRootStore } from '../lib/with-root-store';
import { IProgram, ProgramModel } from '../models/program';
import { EProgramSortFields } from '../types/enums';
import { IProgramFilters } from '../types/types';
import { isUUID, setQueryParam, toCamelCase } from '../utils/utility-functions';

export const ProgramStoreModel = types
  .compose(
    types.model('ProgramStore').props({
      programMap: types.map(ProgramModel),
      tablePrograms: types.array(types.safeReference(ProgramModel)),
      currentProgram: types.maybeNull(types.maybe(types.reference(ProgramModel))),
      submissionInboxSetUpFilter: types.maybeNull(types.string),
    }),
    createSearchModel<EProgramSortFields>('searchPrograms', 'setProgramFilters'),
  )
  .extend(withEnvironment())
  .extend(withRootStore())
  .extend(withMerge())
  .views((self) => ({
    getSortColumnHeader(field: EProgramSortFields) {
      //@ts-ignore
      return t(`program.fields.${toCamelCase(field)}`);
    },
    // View to get a Program by id or slug
    getProgramById(id: string) {
      if (!isUUID(id)) {
        Array.from(self.programMap.values()).find((j) => j.slug == id);
      }

      return self.programMap.get(id);
    },
    // View to get all programs as an array
    get programs() {
      return Array.from(self.programMap.values());
    },
  }))
  .actions((self) => ({
    __beforeMergeUpdate(program) {
      if (!R.isEmpty(program.sandboxes)) {
        self.rootStore.sandboxStore.mergeUpdateAll(program.sandboxes, 'sandboxMap');
      }

      return 'sandboxes' in program
        ? R.mergeRight(program, {
            sandboxes: program.sandboxes?.map((sandbox) => sandbox.id),
          })
        : program;
    },
    // Action to add a new Program
    addProgram(program: IProgram) {
      self.mergeUpdate(program, 'programMap');
    },
    // Action to remove a Program
    removeProgram(id: string) {
      self.programMap.delete(id);
    },
    createProgram: flow(function* (formData: TCreateProgramFormData) {
      const { ok, data: response } = yield* toGenerator(self.environment.api.createProgram(formData));

      if (ok) {
        self.programMap.put(response.data);
        return response.data;
      }
    }),

    updateProgram: flow(function* (id: string, formData: TCreateProgramFormData) {
      const { ok, data: response } = yield* toGenerator(self.environment.api.updateProgram(id, formData));

      if (ok) {
        self.programMap.put(response.data);
        return response.data;
      }
    }),
    searchPrograms: flow(function* (
      opts?: { reset?: boolean; page?: number; countPerPage?: number },
      submissionInboxSetUp?: boolean,
    ) {
      if (opts?.reset) {
        self.resetPages();
      }

      const response = yield* toGenerator(
        self.environment.api.searchPrograms({
          query: self.query,
          sort: self.sort,
          page: opts?.page ?? self.currentPage,
          perPage: opts?.countPerPage ?? self.countPerPage,
          filters: {
            submissionInboxSetUp,
          },
        }),
      );
      if (response.ok) {
        self.mergeUpdateAll(response.data.data, 'programMap');
        self.tablePrograms = cast(response.data.data.map((program) => program.id));
        self.currentPage = opts?.page ?? self.currentPage;
        self.countPerPage = opts?.countPerPage ?? self.countPerPage;
        self.totalPages = response.data.meta.totalPages;
        self.totalCount = response.data.meta.totalCount;
      }
      return response.ok;
    }),
    setProgramFilters(queryParams) {
      const submissionInboxSetUpFilter = queryParams.get('submissionInboxSetUp');

      if (submissionInboxSetUpFilter) {
        self.submissionInboxSetUpFilter = submissionInboxSetUpFilter;
      }
    },
    fetchProgram: flow(function* (id: string) {
      let program = self.getProgramById(id);
      if (!program) {
        // Program not found in the map, fetch from API
        const { ok, data: response } = yield self.environment.api.fetchProgram(id);
        if (ok && response.data) {
          program = response.data;
          self.mergeUpdate(response.data, 'programMap');
        }
      }
      return program;
    }),
    fetchProgramOptions: flow(function* (filters: IProgramFilters) {
      // Program not found in the map, fetch from API
      const { ok, data: response } = yield self.environment.api.fetchProgramOptions(filters);
      return response.data;
    }),
    setCurrentProgram(programId) {
      self.currentProgram = programId;
    },
    resetCurrentProgram() {
      self.currentProgram = null;
    },
    setCurrentProgramBySlug(slug) {
      const j = self.programs.find((j) => j.slug == slug);
      self.currentProgram = j?.id;
      return j?.id;
    },
  }))
  .actions((self) => ({
    searchEnabledPrograms: flow(function* (countPerPage: number = 10) {
      const result = self.searchPrograms({ reset: true, page: 1, countPerPage }, true);
      setQueryParam('currentPage', null);
      return result;
    }),
  }));

export interface IProgramStore extends Instance<typeof ProgramStoreModel> {}
