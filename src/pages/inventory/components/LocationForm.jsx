import { useState, useEffect } from "react";
import { Modal } from "antd";
import useFullscreen from "../../../components/useFullscreen.jsx";
import Swal from "sweetalert2";

export default function LocationForm({
  isOpen,
  onClose,
  onSubmit,
  isEditing = false,
  location = null,
  hasShelves = false,
  isLoading = false,
}) {
  const { ref: fullscreenRef, isFullscreen, getContainer } = useFullscreen();

  // Form state
  const [type, setType] = useState("shelf");
  const [row, setRow] = useState("");
  const [bay, setBay] = useState("");
  const [shelf, setShelf] = useState("");
  const [bin, setBin] = useState("");
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  const [boxName, setBoxName] = useState("");
  const [zoneType, setZoneType] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem("zoneType");
    let ztype = stored;
    try {
      ztype = stored ? JSON.parse(stored) : "";
    } catch (e) {
      // Stored value is not JSON; use as-is
    }
    setZoneType(ztype || "");
  }, []);

  console.log("zonType", zoneType);

  // Initialize form when editing
  useEffect(() => {
    if (isEditing && location) {
      setType(location.type);

      // Parse location code to extract components
      const code = String(location.code || "");
      let match = code.match(/^([A-Za-z])-(\d{1,2})-(\d{1,2})-BIN-(\d{1,2})$/);
      if (match) {
        setRow(match[1].toUpperCase());
        setBay(match[2]);
        setShelf(match[3]);
        setBin(match[4]);
      } else {
        match = code.match(/^([A-Za-z])-(\d{1,2})-(\d{1,2})$/);
        if (match) {
          setRow(match[1].toUpperCase());
          setBay(match[2]);
          setShelf(match[3]);
          setBin("");
        }
      }
    } else {
      // Reset form for new location
      setType("shelf");
      setRow("");
      setBay("");
      setShelf("");
      setBin("");
    }
    setErrors({});
    setError("");
  }, [isEditing, location, isOpen]);

  // Input sanitization helpers
  const sanitizeRow = (v) =>
    v
      .replace(/[^A-Za-z]/g, "")
      .toUpperCase()
      .slice(0, 1);

  const sanitizeNum2 = (v) => {
    const cleaned = String(v || "")
      .replace(/[^0-9]/g, "")
      .replace(/^0+/, "");
    if (!cleaned) return "";
    const n = parseInt(cleaned.slice(0, 2), 10);
    return n > 0 ? String(n) : "";
  };

  const buildCode = (row, bay, shelf, type, binNum) => {
    const base = `${row}-${bay}-${shelf}`;
    return type === "bin" ? `${base}-BIN-${binNum}` : base;
  };

  // Validation
  const validate = () => {
    const errs = {};
    const cleanRow = sanitizeRow(row);
    const cleanBay = sanitizeNum2(bay);
    const cleanShelf = sanitizeNum2(shelf);
    const cleanBin = sanitizeNum2(bin);

    if (type !== "box") {
      if (!cleanRow) errs.row = "Row is required";
      if (!cleanBay) errs.bay = "Bay is required and must be greater than 0";
      if (!cleanShelf)
        errs.shelf = "Shelf is required and must be greater than 0";
      if (type === "bin" && !cleanBin)
        errs.bin = "Bin is required and must be greater than 0";
    }
    if (type === "box" && !boxName) errs.boxName = "Box name is required";

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    const cleanRow = sanitizeRow(row);
    const cleanBay = sanitizeNum2(bay);
    const cleanShelf = sanitizeNum2(shelf);
    const cleanBin = sanitizeNum2(bin);

    if (type !== "box") {
      if (
        !cleanRow ||
        !cleanBay ||
        !cleanShelf ||
        (type === "bin" && !cleanBin)
      ) {
        setError(
          `Please enter row (A), bay (1-99), shelf (1-99)${
            type === "bin" ? " and bin (1-99 for BIN type)." : "."
          }`
        );
        return;
      }
    }
    if (type === "box" && !boxName) {
      setError("Please enter a box name.");
      return;
    }
    setError("");

    const code =
      type === "box"
        ? boxName
        : buildCode(cleanRow, cleanBay, cleanShelf, type, cleanBin);

    onSubmit({
      type,
      code,
      row: cleanRow,
      bay: cleanBay,
      shelf: cleanShelf,
      bin: cleanBin,
      boxName,
    });
  };

  const handleTypeChange = (newType) => {
    if (newType === "bin" && !hasShelves) {
      Swal.fire({
        icon: "warning",
        title: "No shelves",
        text: "You don't have any shelf in this zone. Create a shelf first to add BINs.",
      });
      if (isEditing && location?.type === "bin") {
        setType("bin");
      } else {
        setType("shelf");
      }
      return;
    }
    setType(newType);
  };

  return (
    <div ref={fullscreenRef}>
      <Modal
        getContainer={getContainer}
        key={String(isFullscreen)}
        open={isOpen}
        onCancel={onClose}
        centered
        footer={null}
        width={450}
        closable={false}
        title={null}
        className="max-h-[95vh] overflow-y-auto"
      >
        <form onSubmit={handleSubmit} className="w-full space-y-4">
          <h3 className="text-xl font-semibold">
            {isEditing ? "Edit Location" : "New Location"}
          </h3>

          <div className="space-y-2">
            <label className="block text-sm font-medium">Type</label>
            <select
              value={type}
              onChange={(e) => handleTypeChange(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm bg-white text-black duration-300 ease-in-out focus:border-zinc-400 focus:shadow-lg focus:shadow-zinc-400/50"
            >
              <option value="">Select Type</option>
              {zoneType !== "not_shelf" && <option value="shelf">Shelf</option>}
              {(hasShelves ||
                (isEditing && location?.type === "bin") ||
                zoneType !== "not_shelf") && <option value="bin">Bin</option>}

              {/* {zoneType.toLowerCase() !== "not_shelf" && (
                <option value="bin">Bin</option>
              )} */}
              {zoneType !== "shelf" && <option value="box">Box</option>}
            </select>
          </div>

          {type !== "box" && zoneType !== "not_shelf" && (
            <div className="flex flex-col gap-3">
              <div className="space-y-2">
                <label className="block text-sm font-medium">Row</label>
                <input
                  type="text"
                  value={row}
                  onChange={(e) =>
                    setRow(
                      e.target.value
                        .replace(/[^A-Za-z]/g, "")
                        .toUpperCase()
                        .slice(0, 1)
                    )
                  }
                  placeholder="A"
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm bg-white text-black duration-300 ease-in-out focus:border-zinc-400 focus:shadow-lg focus:shadow-zinc-400/50"
                />
                {errors?.row && (
                  <p className="text-sm text-red-600 mt-1">{errors.row}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium">Bay</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={bay}
                  onChange={(e) =>
                    setBay(
                      e.target.value
                        .replace(/[^0-9]/g, "")
                        .replace(/^0+/, "")
                        .slice(0, 2)
                    )
                  }
                  placeholder="1"
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm bg-white text-black duration-300 ease-in-out focus:border-zinc-400 focus:shadow-lg focus:shadow-zinc-400/50"
                />
                {errors.bay && (
                  <p className="text-sm text-red-600 mt-1">{errors.bay}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium">Shelf</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={shelf}
                  onChange={(e) =>
                    setShelf(
                      e.target.value
                        .replace(/[^0-9]/g, "")
                        .replace(/^0+/, "")
                        .slice(0, 2)
                    )
                  }
                  placeholder="1"
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm bg-white text-black duration-300 ease-in-out focus:border-zinc-400 focus:shadow-lg focus:shadow-zinc-400/50"
                />
                {errors.shelf && (
                  <p className="text-sm text-red-600 mt-1">{errors.shelf}</p>
                )}
              </div>
            </div>
          )}

          {type === "bin" && (
            <div className="space-y-2">
              <label className="block text-sm font-medium">Bin</label>
              <input
                type="text"
                inputMode="numeric"
                value={bin}
                onChange={(e) =>
                  setBin(
                    e.target.value
                      .replace(/[^0-9]/g, "")
                      .replace(/^0+/, "")
                      .slice(0, 2)
                  )
                }
                placeholder="1"
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm bg-white text-black duration-300 ease-in-out focus:border-zinc-400 focus:shadow-lg focus:shadow-zinc-400/50"
              />
              {errors.bin && (
                <p className="text-sm text-red-600 mt-1">{errors.bin}</p>
              )}
            </div>
          )}

          {type === "box" && (
            <div className="space-y-2">
              <label className="block text-sm font-medium">Box Name</label>
              <input
                type="text"
                value={boxName}
                onChange={(e) => setBoxName(e.target.value)}
                placeholder="Box Name"
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm bg-white text-black duration-300 ease-in-out focus:border-zinc-400 focus:shadow-lg focus:shadow-zinc-400/50"
              />
              {errors.boxName && (
                <p className="text-sm text-red-600 mt-1">{errors.boxName}</p>
              )}
            </div>
          )}

          {error && <p className="text-red-600">{error}</p>}

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded disabled:opacity-50"
            >
              {isLoading
                ? isEditing
                  ? "Saving…"
                  : "Creating…"
                : isEditing
                ? "Save"
                : "Create"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
