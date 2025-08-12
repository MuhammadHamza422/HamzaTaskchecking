import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  selectedWarehouseId: null,
  selectedZoneId: null,
};

const appSlice = createSlice({
  name: "app",
  initialState,
  reducers: {
    setSelectedWarehouseId(state, action) {
      state.selectedWarehouseId = action.payload;
      // Reset selected zone when warehouse changes
      if (action.payload === null) {
        state.selectedZoneId = null;
      }
    },
    setSelectedZoneId(state, action) {
      state.selectedZoneId = action.payload;
    },
  },
});

export const { setSelectedWarehouseId, setSelectedZoneId } = appSlice.actions;
export default appSlice.reducer;


