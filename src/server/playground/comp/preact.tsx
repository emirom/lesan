/** @jsx h */
import { h } from "https://esm.sh/preact@10.5.15";
import {
  useEffect,
  useRef,
  useState,
} from "https://esm.sh/preact@10.5.15/hooks";
import { JSONViewer } from "./JSONVeiwer.tsx";
import { TRequest, useLesan } from "./ManagedLesanContext.tsx";

import { History } from "./History.tsx";
import Modal from "./Modal.tsx";
import { Setting } from "./Setting.tsx";
import useModal from "./useModal.tsx";

export const Page = () => {
  const { isOpen, toggleModal } = useModal();

  const {
    act,
    formData,
    getFields,
    headers,
    history,
    method,
    postFields,
    response,
    schema,
    service,
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
    resetPostFields,
  } = useLesan();

  const [active, setActive] = useState("");
  const [actsObj, setActsObj] = useState({});
  const [schemasObj, setSchemasObj] = useState({});
  const [urlAddress, setUrlAddress] = useState(
    window && window.location ? window.location.href : "http://localhost:1366",
  );

  const formRef = useRef<HTMLFormElement>(null);

  const configUrl = (address: string) => {
    setUrlAddress(address);

    setService("");
    setMethod("");
    setSchema("");
    resetGetFields();
    resetPostFields();
    setFormData({});

    fetch(`${address}static/get/schemas`).then((value) => {
      value.json().then(({ schemas, acts }) => {
        setActsObj(acts);
        setSchemasObj(schemas);
      });
    });
  };

  const changeGetValue = (
    value: 0 | 1 | null,
    keyname: string,
    getObj: Record<string, any>,
    returnObj: Record<string, any>,
  ) => {
    for (const key in getObj) {
      getObj[key].type === "enums"
        ? returnObj[`${keyname}.${key}`] = value
        : changeGetValue(
          value,
          `${keyname}.${key}`,
          getObj[key].schema,
          returnObj,
        );
    }
    return returnObj;
  };

  const setFormFromHistory = (request: any) => {
    setService(request.body.service);
    setMethod(request.body.contents);
    setSchema(request.body.wants.model);
    setAct(request.body.wants.act);

    const actObj = (actsObj as any)[request.body.service][
      request.body.contents
    ][request.body.wants.model][request.body.wants.act]["validator"]["schema"];

    setGetFields(actObj["get"]["schema"]);
    setPostFields(actObj["set"]["schema"]);

    setResponse(null);

    const generateFormData = (
      formData: Record<string, any>,
      returnFormData: Record<string, any>,
      keyname: string,
    ) => {
      for (const key in formData) {
        typeof (formData[key]) === "object"
          ? generateFormData(
            formData[key],
            returnFormData,
            keyname ? `${keyname}.${key}` : key,
          )
          : (returnFormData[`${keyname}.${key}`] = formData[key]);
      }
      return returnFormData;
    };

    const historyFromData = generateFormData(request.body.details, {}, "");

    setFormData(historyFromData);

    toggleModal();
  };

  useEffect(() => {
    configUrl(window.location.href);
  }, []);

  const uid = function() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  };

  const handleChange = (event: any) => {
    const { name, value, type, alt } = event.target;
    setFormData({
      ...formData,
      [name]: type === "number"
        ? Number(value)
        : alt === "array" || alt === "boolean"
        ? JSON.parse(value)
        : value,
    });
  };

  const deepen = (obj: Record<string, any>) => {
    const result = { get: {}, set: {} };

    // For each object path (property key) in the object
    for (const objectPath in obj) {
      if (obj[objectPath] || obj[objectPath] === 0) {
        // Split path into component parts
        const parts = objectPath.split(".");
        // Create sub-objects along path as needed
        let target = result;
        while (parts.length > 1) {
          const part = parts.shift();
          target = (target as any)[part!] = (target as any)[part!] || {};
        }
        // Set value at end of path
        (target as any)[parts[0]] = obj[objectPath];
      }
    }

    return result;
  };

  const handleSubmit = async (event: any) => {
    event.preventDefault();
    const details = deepen(formData);

    const body: TRequest = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      body: JSON.stringify({
        service: service,
        contents: method,
        wants: { model: schema, act: act },
        details,
      }),
    };

    const sendedRequest = await fetch(`${urlAddress}lesan`, body);
    const jsonSendedRequest = await sendedRequest.json();

    setResponse(jsonSendedRequest);
    /* event.target.reset(); */
    /* setFormData({}); */

    setHistory([
      {
        request: { ...body, body: JSON.parse(body.body) },
        response: jsonSendedRequest,
        id: uid(),
      },
      ...history,
    ]);
  };

  const renderGetFields = (getField: any, keyName: string, margin: number) => (
    <div
      style={{ marginLeft: `${margin + 1}px` }}
      className="sidebar__section_container"
    >
      <div className="sidebar__section-heading--subfields">{keyName}</div>
      {Object.keys(getField["schema"]).map((item) =>
        getField["schema"][item].type === "enums"
          ? (
            <div className="input-cnt get-items" key={item}>
              <label htmlFor={item}>{keyName}.{item}:</label>
              <div className="get-values">
                <span
                  onClick={() => {
                    const copy = { ...formData };
                    delete copy[`get.${keyName}.${item}`];
                    setFormData(copy);
                  }}
                >
                </span>
                <span
                  className={formData[`get.${keyName}.${item}`] === 0
                    ? "active"
                    : ""}
                  onClick={() => {
                    setFormData({
                      ...formData,
                      [`get.${keyName}.${item}`]: 0,
                    });
                  }}
                >
                  0
                </span>
                <span
                  className={formData[`get.${keyName}.${item}`] === 1
                    ? "active"
                    : ""}
                  onClick={() => {
                    setFormData({
                      ...formData,
                      [`get.${keyName}.${item}`]: 1,
                    });
                  }}
                >
                  1
                </span>
              </div>
            </div>
          )
          : (
            renderGetFields(
              getField["schema"][item],
              `${keyName}.${item}`,
              margin + 1,
            )
          )
      )}
    </div>
  );

  const canShowContent = service && method && schema && postFields &&
    getFields && act;

  const canShowSchema = service && method;

  const canShowAct = service && method && schema;

  return (
    <div className="cnt">
      <div className="sidebar">
        <div className="sections">
          <div className="sidebar__section sidebar__section--services">
            <div className="sidebar__section-heading">select services</div>
            <select
              className="sidebar__select"
              value={service}
              onChange={(event: any) => {
                setService(event.target.value);
                setMethod("");
                setSchema("");
                resetGetFields();
                resetPostFields();
                setFormData({});
              }}
            >
              <option value=""></option>
              {Object.keys(actsObj).map((service, index) => (
                <option key={index} value={service}>
                  {service}
                </option>
              ))}
            </select>
          </div>
          <div className="sidebar__section sidebar__section--method">
            <div className="sidebar__section-heading">select content</div>
            <select
              className="sidebar__select"
              value={method}
              onChange={(event: any) => {
                setMethod(event.target.value);
                setSchema("");
                resetGetFields();
                resetPostFields();
                setFormData({});
              }}
            >
              <option value=""></option>
              <option value="dynamic">dynamic</option>
              <option value="static">static</option>
            </select>
          </div>
          <div className="sidebar__section sidebar__section--schema">
            <div className="sidebar__section-heading">select schema</div>
            <select
              className="sidebar__select"
              disabled={!canShowSchema}
              value={canShowSchema ? schema : undefined}
              onChange={(event: any) => {
                setSchema(event.target.value);
                resetGetFields();
                resetPostFields();
                setFormData({});
              }}
            >
              <option value=""></option>
              {canShowSchema
                ? Object.keys((actsObj as any)[service][method]).map(
                  (schema) => <option value={schema}>{schema}</option>,
                )
                : null}
            </select>
          </div>
          <div className="sidebar__section sidebar__section--act">
            <div className="sidebar__section-heading">select action</div>
            <select
              className="sidebar__select"
              disabled={!canShowAct}
              value={canShowAct ? act : undefined}
              onChange={(event: any) => {
                const actObj = (actsObj as any)[service][method][schema][
                  event.target.value
                ]["validator"]["schema"];

                formRef && formRef.current && formRef.current.reset();
                setAct(event.target.value);
                setGetFields(actObj["get"]["schema"]);
                setPostFields(actObj["set"]["schema"]);
                setFormData({});
              }}
            >
              <option value=""></option>
              {canShowAct
                ? Object.keys((actsObj as any)[service][method][schema]).map(
                  (schema) => <option value={schema}>{schema}</option>,
                )
                : null}
            </select>
          </div>
        </div>
        <div className="">
          {" "}
          <button
            className="btn btn-modal"
            onClick={() => {
              setActive("History");
              toggleModal();
            }}
          >
            {" "}
            History{" "}
          </button>
          <button
            className="btn btn-modal btn-modal-2"
            onClick={() => {
              setActive("Setting");
              toggleModal();
            }}
          >
            {/* {console.log(active)} */}
            Setting
          </button>
          <button
            className="btn btn-modal btn-modal-3"
            onClick={() => {
              setActive("Graph");
              toggleModal();
            }}
          >
            Graph
          </button>
          <button
            className="btn btn-modal btn-modal-4"
            onClick={() => {
              setActive("E2E Test");
              toggleModal();
            }}
          >
            E2E Test
          </button>
        </div>
      </div>

      {canShowContent && (
        <div className="sidebar sidebar--fields">
          <form ref={formRef} onSubmit={handleSubmit} className="form--fields">
            <div className="sidebar__section-heading sidebar__section-heading--fields">
              SET fields
            </div>
            {Object.keys(postFields).map((item) => (
              <div className="input-cnt" key={item}>
                <label htmlFor={item}>{item}:</label>
                {postFields[item]["type"] === "enums"
                  ? (
                    <select
                      className="sidebar__select"
                      value={formData[`set.${item}`]}
                      onChange={(event: any) => {
                        setFormData({
                          ...formData,
                          [`set.${item}`]: event.target.value,
                        });
                      }}
                    >
                      <option value=""></option>
                      {Object.keys(postFields[item]["schema"]).map((schema) => (
                        <option value={schema}>{schema}</option>
                      ))}
                    </select>
                  )
                  : (
                    <input
                      placeholder={item}
                      id={item}
                      value={formData[`set.${item}`]}
                      name={`set.${item}`}
                      type={postFields[item]["type"] === "number"
                        ? "number"
                        : "string"}
                      alt={postFields[item]["type"]}
                      onChange={handleChange}
                    />
                  )}
              </div>
            ))}
            <div className="sidebar__section-heading sidebar__section-heading--fields">
              GET fields
            </div>

            <div className="input-cnt get-items border-bottom">
              <label>All Items :</label>
              <div className="get-values">
                <span
                  onClick={() => {
                    const copy = changeGetValue(null, "get", getFields, {});
                    setFormData({ ...formData, ...copy });
                  }}
                >
                </span>
                <span
                  onClick={() => {
                    const copy = changeGetValue(0, "get", getFields, {});
                    setFormData({
                      ...formData,
                      ...copy,
                    });
                  }}
                >
                  0
                </span>
                <span
                  onClick={() => {
                    const copy = changeGetValue(1, "get", getFields, {});
                    setFormData({
                      ...formData,
                      ...copy,
                    });
                  }}
                >
                  1
                </span>
              </div>
            </div>

            {Object.keys(getFields).map((item) =>
              getFields[item].type === "enums"
                ? (
                  <div className="input-cnt get-items">
                    <label htmlFor={item}>{item}:</label>
                    <div className="get-values">
                      <span
                        onClick={() => {
                          const copy = { ...formData };
                          delete copy[`get.${item}`];
                          setFormData(copy);
                        }}
                      >
                      </span>
                      <span
                        className={formData[`get.${item}`] === 0
                          ? "active"
                          : ""}
                        onClick={() => {
                          setFormData({
                            ...formData,
                            [`get.${item}`]: 0,
                          });
                        }}
                      >
                        0
                      </span>
                      <span
                        className={formData[`get.${item}`] === 1
                          ? "active"
                          : ""}
                        onClick={() => {
                          setFormData({
                            ...formData,
                            [`get.${item}`]: 1,
                          });
                        }}
                      >
                        1
                      </span>
                    </div>
                  </div>
                )
                : (
                  renderGetFields(getFields[item], item, 0)
                )
            )}
            <div className="cnt--btn-send">
              <button className="btn btn--send" type="submit">
                send
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="response">
        {response && (
          <div class="response-detail">
            <p className="response-detail-title">Response</p>
            <div className="response-detail-info">
              <JSONViewer jsonData={response} />
              {response && response?.success === true
                ? <div className="success"></div>
                : <div className="fail"></div>}
            </div>
          </div>
        )}
      </div>
      {isOpen && (
        <Modal toggle={toggleModal} title={active}>
          {active === "History"
            ? <History setFormFromHistory={setFormFromHistory} />
            : active === "Setting"
            ? <Setting configUrl={configUrl} />
            : (
              ""
            )}
        </Modal>
      )}
    </div>
  );
};
