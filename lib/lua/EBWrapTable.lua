require('torch')
require('nn')

local EBWrapTable, parent = torch.class('nn.EBWrapTable', 'nn.Module')

function EBWrapTable:__init(name)
    parent.__init(self)
    self.name = name
end

function EBWrapTable:updateOutput(input)
    self.output = {input}
    return self.output
end


function EBWrapTable:updateGradInput(input, gradOutput)
    self.gradInput = gradOutput[1]
    return self.gradInput
end

function EBWrapTable:clearState()
    -- don't call set because it might reset referenced tensors
    local function clear(f)
        if self[f] then
            if torch.isTensor(self[f]) then
                self[f] = self[f].new()
            elseif type(self[f]) == 'table' then
                self[f] = {}
            else
                self[f] = nil
            end
        end
    end
    clear('output')
    clear('gradInput')
    return self
end
