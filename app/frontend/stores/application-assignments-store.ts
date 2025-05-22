import { flow, Instance, types } from "mobx-state-tree"
import * as R from "ramda"
import { createSearchModel } from "../lib/create-search-model"
import { withEnvironment } from "../lib/with-environment"
import { withMerge } from "../lib/with-merge"
import { withRootStore } from "../lib/with-root-store"
import { AssignmentModel, IAssignment } from "../models/Assignment"
import { IJurisdiction } from "../models/jurisdiction"
import { IUser } from "../models/user"
import { ECollaborationType, EAssignmentableType } from "../types/enums"
import { TSearchParams } from "../types/types"

export const AssignmentsStoreModel = types
  .compose(
    types.model("AssignmentStore", {
      AssignmentMap: types.map(AssignmentModel),
      AssignmentSearchList: types.array(types.reference(AssignmentModel)),
      searchContext: types.maybeNull(types.enumeration(Object.values(ECollaborationType))),
    }),
    createSearchModel<never>("searchAssignments", undefined, true)
  )
  .extend(withEnvironment())
  .extend(withRootStore())
  .extend(withMerge())
  .views((self) => ({
    getAssignmentById(id: string) {
      return self.AssignmentMap.get(id)
    },
    getFilteredCollaborationSearchList(takenAssignmentIds: Set<string>) {
      return self.AssignmentSearchList.filter((c) => !takenAssignmentIds.has(c.id))
    },
  }))
  .actions((self) => ({
    __beforeMergeUpdate(AssignmentData) {
      if (!AssignmentData.skipAssociationMerges) {
        AssignmentData.AssignmentableType === EAssignmentableType.User &&
          self.rootStore.userStore.mergeUpdate(AssignmentData.Assignmentable, "usersMap")
        AssignmentData.AssignmentableType === EAssignmentableType.Jurisdiction &&
          self.rootStore.jurisdictionStore.mergeUpdate(AssignmentData.Assignmentable, "jurisdictionMap")

        AssignmentData.user && self.rootStore.userStore.mergeUpdate(AssignmentData.user, "usersMap")
      }

      return AssignmentData
    },
    __beforeMergeUpdateAll(AssignmentsData) {
      //find all unique jurisdictions
      const jurisdictionsUniq = R.uniqBy(
        (j: IJurisdiction) => j.id,
        AssignmentsData
          .filter((c) => c.AssignmentableType === EAssignmentableType.Jurisdiction)
          .map((c) => c.Assignmentable)
      )
      self.rootStore.jurisdictionStore.mergeUpdateAll(jurisdictionsUniq, "jurisdictionMap")

      //find all unique submitters
      const users = R.uniqBy(
        (u: IUser) => u.id,
        AssignmentsData
          .filter((c) => c.AssignmentableType === EAssignmentableType.User)
          .map((c) => c.Assignmentable)
          .concat(AssignmentsData.map((c) => c.user))
      )

      self.rootStore.userStore.mergeUpdateAll(users, "usersMap")

      // Already merged associations here.
      // Since beforeMergeUpdateAll internally uses beforeMergeUpdate, we need to skip the association merges
      // to reduce duplication of work

      AssignmentsData.skipAssociationMerges = true

      return AssignmentsData
    },
  }))
  .actions((self) => ({
    setAssignmentSearchList: (Assignments) => {
      self.AssignmentSearchList = Assignments.map((c) => c.id)
    },
    addAssignment(Assignment: IAssignment) {
      self.AssignmentMap.put(Assignment)
    },
    setSearchContext(context: ECollaborationType | null) {
      self.searchContext = context
    },
  }))
  .actions((self) => ({
    searchAssignments: flow(function* (opts?: { reset?: boolean; page?: number; countPerPage?: number }) {
      let currentUser = self.rootStore.userStore?.currentUser

      if (!currentUser) {
        return
      }
      if (opts?.reset) {
        self.resetPages()
      }

      const searchParams = {
        query: self.query,
        sort: self.sort,
        page: opts?.page ?? self.currentPage,
        perPage: opts?.countPerPage ?? self.countPerPage,
      } as TSearchParams<never, never>

      const response = yield self.environment.api.fetchAssignmentsByAssignmentable(
        self.searchContext === ECollaborationType.review ? currentUser.jurisdiction?.id : currentUser.id,
        searchParams
      )

      if (response.ok) {
        self.mergeUpdateAll(response.data.data, "AssignmentMap")
        self.setAssignmentSearchList(response.data.data)

        self.currentPage = opts?.page ?? self.currentPage
        self.totalPages = response.data.meta.totalPages
        self.totalCount = response.data.meta.totalCount
        self.countPerPage = opts?.countPerPage ?? self.countPerPage
      }
      return response.ok
    }),
  }))

export interface IAssignmentStore extends Instance<typeof AssignmentsStoreModel> {}
