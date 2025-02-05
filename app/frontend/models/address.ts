import { Instance, types } from "mobx-state-tree"
import { withEnvironment } from "../lib/with-environment"
import { withRootStore } from "../lib/with-root-store"

export const AddressModel = types
    .model("AddressModel", {
        id: types.identifier,
        streetAddress: types.maybeNull(types.string),
        locality: types.maybeNull(types.string),
        region: types.maybeNull(types.string),
        postalCode: types.maybeNull(types.string),
        country: types.maybeNull(types.string),
        addressType: types.maybeNull(types.string),
    })
    .extend(withEnvironment())
    .extend(withRootStore());

    export interface IAddress extends Instance<typeof AddressModel> {}