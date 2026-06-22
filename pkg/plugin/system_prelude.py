GF_FALSES = ["false", "f", "no", "n", "off", "0", "disable", "disabled", ""]
class GrafanaSupport(dict):
  def float(self, name, default=0.0):
    return float(self[name]) if name in self and self[name] != "" else default
  def int(self, name, default=0):
    return int(self[name]) if name in self and self[name] != "" else default
  def str(self, name, default=""):
    return self[name] if name in self and self[name] != "" else default
  def bool(self, name, default=False):
    return (self[name].lower() not in GF_FALSES) if name in self and self[name] != "" else default
  def list(self, name, default=[]):
    return self[name].replace("{", "").replace("}", "").split(",") if name in self and self[name] != "" and self[name] != "{}" else default
