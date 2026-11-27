"""The state one build of tools/scene.py shares between its phases (scenelib/load.py … output.py) and the step / view
helpers (steps.py, views.py): the arguments, the scene file, the cast, the turn lists, the page parts…"""


class State:
    """Plain attributes. A phase reads what earlier phases made with `take` and stores what later phases (or the step /
    view helpers, which read it on every call) need with `keep`."""

    def __init__(self, **values):
        self.__dict__.update(values)

    def take(self, *names):
        return tuple(getattr(self, name) for name in names)

    def keep(self, **values):
        self.__dict__.update(values)
