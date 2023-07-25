/** @jsx h */
import { Fragment, h, useEffect, useState } from "../reactDeps.ts";
import { createNestedObjectsFromKeys } from "../utils/createNestedObjectsFromKeys.ts";
import { generateFormData } from "../utils/generateFormData.ts";
import { E2E } from "./E2E.tsx";
import { History } from "./History.tsx";
import GraphIcon from "./icon/GraphIcon.tsx";
import HistoryIcon from "./icon/HistoryIcon.tsx";
import SettingIcon from "./icon/SettingIcon.tsx";
import TestIcon from "./icon/TestIcon.tsx";
import { Main } from "./Main.tsx";
import { useLesan } from "./ManagedLesanContext.tsx";
import Modal from "./Modal.tsx";
import { Setting } from "./Setting.tsx";
import useModal from "./useModal.tsx";

const getSchemasAPI = ({ baseUrl }: { baseUrl: string }) =>
  fetch(`${baseUrl}playground/static/get/schemas`).then((res) => res.json());

enum MODAL_TYPES {
  HISTORY = "HISTORY",
  GRAPH = "GRAPH",
  SETTING = "SETTING",
  E2E_TEST = "E2E TEST",
}

export const Page = () => {
  const { isOpen, toggleModal } = useModal();

  const {
    tabsData,
    setTabsData,
    activeTab,
    actsObj,
    addTab,
    setActiveTab,
    setService,
    setMethod,
    setSchema,
    setAct,
    setPostFields,
    setGetFields,
    setFormData,
    setHistory,
    setResponse,
    resetGetFields,
    closeTab,
    resetPostFields,
    setSchemasObj,
    setActsObj,
  } = useLesan();

  const [active, setActive] = useState("");

  const parsedWindowUrl = () => {
    return window && window.location
      ? `${new URL(window.location.href).origin}/`
      : "http://localhost:1366/";
  };

  const [urlAddress, setUrlAddress] = useState("");

  useEffect(() => {
    configUrl(parsedWindowUrl());

    // const localTabsData = localStorage.getItem("localTabsData");
    // console.log("localTabsData", JSON.parse(localTabsData!));
    // if (localTabsData) setTabsData(JSON.parse(localTabsData));

    const localHistory = JSON.parse(localStorage.getItem("localHistory")!);
    if (localHistory) setHistory(localHistory);
  }, []);

  const configUrl = (address?: string) => {
    address && setUrlAddress(address);

    setService({ data: "", index: activeTab });
    setMethod({ data: "", index: activeTab });
    setSchema({ data: "", index: activeTab });
    resetGetFields(activeTab);
    resetPostFields(activeTab);
    setFormData({ data: {}, index: activeTab });

    getSchemasAPI({ baseUrl: address ? address : urlAddress }).then(
      ({ schemas, acts }) => {
        setActsObj(acts);
        setSchemasObj(schemas);

        let localTabsData = localStorage.getItem("localTabsData");

        if (localTabsData) {
          localTabsData = JSON.parse(localTabsData);

          const parsedLocalTabData: any[] = [];

          const proccessTabData = (tab: any) => {
            parsedLocalTabData.pop();

            // form data section --- begin
            const parsedFromData = createNestedObjectsFromKeys(
              tab.formData,
            );

            // set fileds section --- begin
            for (const setKeys in parsedFromData.set) {
              if (
                acts[tab.service][tab.method][tab.schema][tab.act]
                  .validator.schema.set.schema[setKeys] === undefined
              ) {
                delete parsedFromData.set[setKeys];
              }
            }
            // TODO : we need to check field type also in set fields inside acts[tab.service][tab.method][tab.schema][tab.act].validator.schema.set.schema[setKeys].type

            // set fileds section --- end

            // get fileds section --- begin
            for (const getKey in parsedFromData.get) {
              if (
                acts[tab.service][tab.method][tab.schema][tab.act]
                  .validator.schema.get.schema[getKey] === undefined
              ) {
                delete parsedFromData.get[getKey];
              }
            }
            // get fileds section --- end

            const newGeneratedFormData = generateFormData(
              parsedFromData,
              {},
              "",
            );
            // form data section --- end

            // set fileds section --- begin
            tab.postFields = acts[tab.service][tab.method][tab.schema][tab.act]
              .validator.schema.set.schema;
            // set fileds section --- end

            // get fileds section --- begin
            tab.getFields = acts[tab.service][tab.method][tab.schema][tab.act]
              .validator.schema.get.schema;
            // get fileds section --- end

            parsedLocalTabData.push({
              ...tab,
              formData: newGeneratedFormData,
            });
          };

          for (const tab of localTabsData as any) {
            if (tab.service && tab.service in acts) {
              parsedLocalTabData.push(tab);
            }

            if (tab.method && !(tab.method in acts[tab.service])) {
              parsedLocalTabData.pop();
            }

            if (tab.schema && !(tab.schema in acts[tab.service][tab.method])) {
              parsedLocalTabData.pop();
            }

            if (
              tab.act && !(tab.act in acts[tab.service][tab.method][tab.schema])
            ) {
              parsedLocalTabData.pop();
            }

            if (
              tab.service &&
              tab.method &&
              tab.schema &&
              tab.act &&
              (tab.act in acts[tab.service][tab.method][tab.schema])
            ) {
              proccessTabData(tab);
            }
          }

          setTabsData(parsedLocalTabData);
        }
      },
    );
  };

  const setFormFromHistory = (request: any) => {
    setService({ data: request.body.service, index: activeTab });
    setMethod({ data: request.body.contents, index: activeTab });
    setSchema({ data: request.body.wants.model, index: activeTab });
    setAct({ data: request.body.wants.act, index: activeTab });

    const actObj = (actsObj as any)[request.body.service][
      request.body.contents
    ][request.body.wants.model][request.body.wants.act]["validator"]["schema"];

    setGetFields({ data: actObj["get"]["schema"], index: activeTab });
    setPostFields({ data: actObj["set"]["schema"], index: activeTab });

    setResponse({ data: null, index: activeTab });

    const historyFromData = generateFormData(request.body.details, {}, "");

    setFormData({ data: historyFromData, index: activeTab });

    toggleModal();
  };

  const modalBtnClickHandler = (type: MODAL_TYPES) => {
    setActive(type);
    toggleModal();
  };

  return (
    <div className="cnt">
      <div className="tabs-container" style={{ display: "flex" }}>
        {tabsData.map((tab, index) => (
          <Fragment>
            <div
              className="tab-name"
              data-tab={activeTab === index}
              onClick={() => {
                setActiveTab(index);
              }}
            >
              {tabsData[index].act
                ? `${tabsData[index].schema} | ${tabsData[index].act}`
                : tabsData[index].schema
                ? `${tabsData[index].method} | ${tabsData[index].schema}`
                : tabsData[index].method
                ? `${tabsData[index].service} | ${tabsData[index].method}`
                : tabsData[index].service
                ? tabsData[index].service
                : `Tab ${index}`}
              <span
                className="add-tab tab-close"
                onClick={(event) => {
                  event.stopPropagation();
                  closeTab(index);
                }}
              >
                x
              </span>
            </div>
          </Fragment>
        ))}
        <span
          className="add-tab"
          onClick={() => {
            addTab(null);
            // TODO: مربوط به تودو بالایی
            localStorage.setItem("localTabsData", JSON.stringify(tabsData));
          }}
        >
          +
        </span>
      </div>
      <Main urlAddress={urlAddress} />

      <div className="sidebar__btns-wrapper">
        <span
          className="btn-modal"
          onClick={() => modalBtnClickHandler(MODAL_TYPES.HISTORY)}
        >
          <span className="tooltip-text">History</span>
          <HistoryIcon />
        </span>
        <span
          className="btn-modal"
          onClick={() => modalBtnClickHandler(MODAL_TYPES.SETTING)}
        >
          <span className="tooltip-text">Setting</span>
          <SettingIcon />
        </span>
        <span
          className="btn-modal"
          onClick={() => modalBtnClickHandler(MODAL_TYPES.GRAPH)}
        >
          <span className="tooltip-text">Graph</span>
          <GraphIcon />
        </span>
        <span
          className="btn-modal"
          onClick={() => modalBtnClickHandler(MODAL_TYPES.E2E_TEST)}
        >
          <span className="tooltip-text">Test</span>
          <TestIcon />
        </span>
      </div>

      {isOpen && (
        <Modal toggle={toggleModal} title={active}>
          {active === MODAL_TYPES.HISTORY
            ? <History setFormFromHistory={setFormFromHistory} />
            : active === MODAL_TYPES.SETTING
            ? <Setting configUrl={configUrl} />
            : active === MODAL_TYPES.E2E_TEST
            ? <E2E baseUrl={urlAddress} />
            : <Fragment></Fragment>}
        </Modal>
      )}
    </div>
  );
};
